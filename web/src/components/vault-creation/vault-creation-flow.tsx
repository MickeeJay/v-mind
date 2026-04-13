"use client";

import * as React from 'react';

import type {
  VaultCreationError,
  VaultCreationPricing,
  VaultCreationProtocolConfig,
  VaultCreationStep,
  VaultStrategy,
} from '@/types/vault-creation';

import { ChooseStrategyStep } from '@/components/vault-creation/choose-strategy-step';
import { ConfigureDepositStep } from '@/components/vault-creation/configure-deposit-step';
import { ReviewConfirmStep } from '@/components/vault-creation/review-confirm-step';
import { TransactionPendingStep } from '@/components/vault-creation/transaction-pending-step';
import { VaultCreationStepper } from '@/components/vault-creation/vault-creation-stepper';
import { VaultCreationSuccessStep } from '@/components/vault-creation/vault-creation-success-step';
import { useToast } from '@/hooks/use-toast';
import { useWallet } from '@/hooks/use-wallet';
import {
  fetchAvailableStrategies,
  fetchVaultCreationPricing,
  fetchVaultCreationProtocolConfig,
  fetchWalletBalanceSnapshot,
} from '@/lib/vault-creation-api';
import {
  MICROSTX_PRECISION,
  estimateMintedShares,
  parseMicrostxInput,
} from '@/lib/vault-creation-formatters';
import {
  classifyVaultTransactionError,
  getExplorerTxUrl,
  pollVaultCreationConfirmation,
  submitVaultCreationTransaction,
} from '@/lib/vault-creation-transactions';

function maxBigInt(left: bigint, right: bigint): bigint {
  return left > right ? left : right;
}

function mapTransactionError(error: unknown): VaultCreationError {
  const classified = classifyVaultTransactionError(error);

  if (classified.kind === 'wallet-rejection') {
    return {
      type: 'wallet-rejection',
      title: 'Transaction canceled in wallet',
      message: 'The wallet request was canceled. Review details and submit again when ready.',
      details: classified.message,
    };
  }

  if (classified.kind === 'onchain-failure') {
    return {
      type: 'onchain-failure',
      title: 'Transaction failed on-chain',
      message: 'The contract call was broadcast but did not complete successfully.',
      details: classified.message,
    };
  }

  return {
    type: 'network-error',
    title: 'Network error',
    message: 'Unable to complete vault creation due to a network or API issue. Please retry.',
    details: classified.message,
  };
}

export function VaultCreationFlow(): JSX.Element {
  const { address } = useWallet();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = React.useState<VaultCreationStep>(1);
  const [strategies, setStrategies] = React.useState<VaultStrategy[]>([]);
  const [selectedStrategyId, setSelectedStrategyId] = React.useState<bigint | null>(null);
  const [amountInput, setAmountInput] = React.useState('');
  const [riskAcknowledged, setRiskAcknowledged] = React.useState(false);

  const [protocolConfig, setProtocolConfig] = React.useState<VaultCreationProtocolConfig | null>(null);
  const [pricing, setPricing] = React.useState<VaultCreationPricing | null>(null);
  const [walletBalanceMicrostx, setWalletBalanceMicrostx] = React.useState<bigint>(0n);

  const [loadingBaseData, setLoadingBaseData] = React.useState(true);
  const [baseDataError, setBaseDataError] = React.useState<string | null>(null);

  const [submitting, setSubmitting] = React.useState(false);
  const [polling, setPolling] = React.useState(false);
  const [txId, setTxId] = React.useState<string | null>(null);
  const [confirmedVaultId, setConfirmedVaultId] = React.useState<bigint | null>(null);
  const [flowError, setFlowError] = React.useState<VaultCreationError | null>(null);

  const pollControllerRef = React.useRef<AbortController | null>(null);

  const selectedStrategy = React.useMemo(() => {
    if (!selectedStrategyId) {
      return null;
    }

    return strategies.find((strategy) => strategy.id === selectedStrategyId) ?? null;
  }, [selectedStrategyId, strategies]);

  const parsedDeposit = React.useMemo(() => parseMicrostxInput(amountInput), [amountInput]);

  const effectiveMinimumDeposit = React.useMemo(() => {
    if (!protocolConfig) {
      return 0n;
    }

    if (!selectedStrategy) {
      return protocolConfig.minimumDepositMicrostx;
    }

    return maxBigInt(protocolConfig.minimumDepositMicrostx, selectedStrategy.targetAssetMinDepositMicrostx);
  }, [protocolConfig, selectedStrategy]);

  const estimatedShares = React.useMemo(() => {
    if (!pricing || !parsedDeposit || parsedDeposit <= 0n) {
      return 0n;
    }

    return estimateMintedShares(parsedDeposit, pricing.pricePerShareScaled, pricing.shareScale);
  }, [parsedDeposit, pricing]);

  const depositValidationMessage = React.useMemo(() => {
    if (!amountInput.trim()) {
      return 'Enter a deposit amount to continue.';
    }

    if (!parsedDeposit) {
      return 'Use a valid amount with up to 6 decimal places.';
    }

    if (parsedDeposit <= 0n) {
      return 'Deposit amount must be greater than zero.';
    }

    if (parsedDeposit < effectiveMinimumDeposit) {
      return 'Deposit amount is below the protocol minimum for this asset.';
    }

    if (parsedDeposit > walletBalanceMicrostx) {
      return 'Deposit amount exceeds your connected wallet balance.';
    }

    return null;
  }, [amountInput, effectiveMinimumDeposit, parsedDeposit, walletBalanceMicrostx]);

  const loadBaseData = React.useCallback(async () => {
    if (!address) {
      return;
    }

    setLoadingBaseData(true);
    setBaseDataError(null);

    try {
      const [availableStrategies, protocolSnapshot, pricingSnapshot, walletBalance] = await Promise.all([
        fetchAvailableStrategies(address),
        fetchVaultCreationProtocolConfig(address),
        fetchVaultCreationPricing(address),
        fetchWalletBalanceSnapshot(address),
      ]);

      setStrategies(availableStrategies);
      setProtocolConfig(protocolSnapshot);
      setPricing(pricingSnapshot);
      setWalletBalanceMicrostx(walletBalance.stxBalanceMicrostx);

      const firstStrategy = availableStrategies[0];
      if (firstStrategy && !selectedStrategyId) {
        setSelectedStrategyId(firstStrategy.id);
      }
    } catch (error) {
      setBaseDataError(error instanceof Error ? error.message : 'Unable to load required vault creation data.');
    } finally {
      setLoadingBaseData(false);
    }
  }, [address, selectedStrategyId]);

  React.useEffect(() => {
    void loadBaseData();
  }, [loadBaseData]);

  React.useEffect(() => {
    return () => {
      pollControllerRef.current?.abort();
    };
  }, []);

  const handleSubmitTransaction = React.useCallback(async () => {
    if (!address || !selectedStrategy || !parsedDeposit) {
      return;
    }

    setSubmitting(true);
    setFlowError(null);
    setCurrentStep(4);

    try {
      const submission = await submitVaultCreationTransaction({
        walletAddress: address,
        assetContractPrincipal: selectedStrategy.targetProtocolPrincipal,
        depositMicrostx: parsedDeposit,
        strategyId: selectedStrategy.id,
      });

      setTxId(submission.txId);
      setPolling(true);

      pollControllerRef.current?.abort();
      const nextController = new AbortController();
      pollControllerRef.current = nextController;

      const confirmation = await pollVaultCreationConfirmation(submission.txId, {
        signal: nextController.signal,
      });

      setConfirmedVaultId(confirmation.vaultId);
      setCurrentStep(5);
      setFlowError(null);

      toast({
        title: 'Vault creation confirmed',
        description: confirmation.vaultId
          ? `Vault #${confirmation.vaultId.toString()} is now live.`
          : 'Your vault transaction was confirmed on-chain.',
      });
    } catch (error) {
      setFlowError(mapTransactionError(error));
    } finally {
      setSubmitting(false);
      setPolling(false);
    }
  }, [address, parsedDeposit, selectedStrategy, toast]);

  const retryPolling = React.useCallback(async () => {
    if (!txId) {
      return;
    }

    setPolling(true);
    setFlowError(null);

    try {
      pollControllerRef.current?.abort();
      const nextController = new AbortController();
      pollControllerRef.current = nextController;

      const confirmation = await pollVaultCreationConfirmation(txId, {
        signal: nextController.signal,
      });

      setConfirmedVaultId(confirmation.vaultId);
      setCurrentStep(5);
    } catch (error) {
      setFlowError(mapTransactionError(error));
    } finally {
      setPolling(false);
    }
  }, [txId]);

  if (!address) {
    return (
      <section className="rounded-2xl border border-border/70 bg-card/60 p-6">
        <h1 className="font-[var(--font-display)] text-2xl font-semibold tracking-tight">Connect a wallet to create a vault</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A connected wallet is required before selecting strategies and submitting an on-chain vault creation transaction.
        </p>
      </section>
    );
  }

  const stepContent = (() => {
    if (currentStep === 1) {
      return (
        <ChooseStrategyStep
          strategies={strategies}
          selectedStrategyId={selectedStrategyId}
          loading={loadingBaseData}
          errorMessage={baseDataError}
          onRetry={() => {
            void loadBaseData();
          }}
          onSelect={(strategyId) => {
            setSelectedStrategyId(strategyId);
          }}
          onNext={() => {
            if (selectedStrategyId) {
              setCurrentStep(2);
            }
          }}
        />
      );
    }

    if (!selectedStrategy || !protocolConfig || !pricing) {
      return (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm" role="alert">
          <p className="font-semibold text-foreground">Required vault data is missing</p>
          <p className="mt-1 text-muted-foreground">Reload strategy and protocol configuration before proceeding.</p>
        </div>
      );
    }

    if (currentStep === 2) {
      return (
        <ConfigureDepositStep
          strategy={selectedStrategy}
          amountInput={amountInput}
          onAmountInputChange={setAmountInput}
          walletBalanceMicrostx={walletBalanceMicrostx}
          minimumDepositMicrostx={effectiveMinimumDeposit}
          estimatedShares={estimatedShares}
          sharePriceScaled={pricing.pricePerShareScaled}
          shareScale={pricing.shareScale}
          validationMessage={depositValidationMessage}
          onBack={() => {
            setCurrentStep(1);
          }}
          onNext={() => {
            if (!depositValidationMessage) {
              setCurrentStep(3);
            }
          }}
        />
      );
    }

    if (currentStep === 3) {
      return (
        <ReviewConfirmStep
          strategy={selectedStrategy}
          depositMicrostx={parsedDeposit ?? 0n}
          estimatedShares={estimatedShares}
          protocolFeeBps={protocolConfig.performanceFeeBps}
          riskAcknowledged={riskAcknowledged}
          onRiskAcknowledgedChange={setRiskAcknowledged}
          onBack={() => {
            setCurrentStep(2);
          }}
          onConfirm={() => {
            void handleSubmitTransaction();
          }}
          submitting={submitting}
        />
      );
    }

    if (currentStep === 4) {
      return (
        <TransactionPendingStep
          txId={txId}
          explorerTxUrl={txId ? getExplorerTxUrl(txId) : null}
          polling={polling}
          error={flowError}
          onRetryPolling={() => {
            void retryPolling();
          }}
          onBackToReview={() => {
            setFlowError(null);
            setCurrentStep(3);
          }}
        />
      );
    }

    return <VaultCreationSuccessStep vaultId={confirmedVaultId} />;
  })();

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border/70 bg-card/60 p-4">
        <h1 className="font-[var(--font-display)] text-2xl font-semibold tracking-tight">Create vault</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Follow each step carefully. A vault creation transaction commits {MICROSTX_PRECISION.toString()}-precision
          asset units on-chain.
        </p>
      </section>

      <VaultCreationStepper currentStep={currentStep} />
      {stepContent}
    </div>
  );
}
