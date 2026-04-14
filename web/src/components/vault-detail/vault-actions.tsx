'use client';

import { Lock, PauseCircle, ShieldAlert, SquareDashedBottom, Wallet } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useWallet } from '@/hooks/use-wallet';
import { parseMicrostxInput, formatMicrostx } from '@/lib/vault-creation-formatters';
import {
  buildDepositArgs,
  buildVaultActionTxUrl,
  buildVaultIdArgs,
  buildWithdrawArgs,
  pollVaultActionConfirmation,
  submitVaultActionTransaction,
  VaultActionTransactionError,
} from '@/lib/vault-detail-transactions';

import type { VaultDetailSnapshot } from '@/types/vault-detail';

interface VaultActionsProps {
  snapshot: VaultDetailSnapshot;
}

type PendingAction = 'deposit' | 'withdraw' | 'pause' | 'close' | null;

function mapActionLabel(action: PendingAction): string {
  if (action === 'deposit') {
    return 'deposit';
  }

  if (action === 'withdraw') {
    return 'withdrawal';
  }

  if (action === 'pause') {
    return 'pause';
  }

  if (action === 'close') {
    return 'close';
  }

  return 'transaction';
}

export function VaultActions({ snapshot }: VaultActionsProps): JSX.Element {
  const { address } = useWallet();
  const { toast } = useToast();

  const [depositInput, setDepositInput] = React.useState('');
  const [withdrawInput, setWithdrawInput] = React.useState('');
  const [pendingAction, setPendingAction] = React.useState<PendingAction>(null);
  const [transactionId, setTransactionId] = React.useState<string | null>(null);
  const [polling, setPolling] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const pollControllerRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    return () => {
      pollControllerRef.current?.abort();
    };
  }, []);

  const isOwner = Boolean(address && address.toLowerCase() === snapshot.ownerPrincipal.toLowerCase());
  const depositAmount = React.useMemo(() => parseMicrostxInput(depositInput), [depositInput]);
  const withdrawAmount = React.useMemo(() => parseMicrostxInput(withdrawInput), [withdrawInput]);

  const clearTransactionState = React.useCallback(() => {
    setPendingAction(null);
    setTransactionId(null);
    setPolling(false);
  }, []);

  const runTransaction = React.useCallback(
    async (action: PendingAction, functionName: string, functionArgs: Parameters<typeof submitVaultActionTransaction>[0]['functionArgs']) => {
      if (!address || !isOwner) {
        return;
      }

      setPendingAction(action);
      setErrorMessage(null);
      setPolling(false);

      try {
        const submission = await submitVaultActionTransaction({
          walletAddress: address,
          functionName,
          functionArgs,
        });

        setTransactionId(submission.txId);
        setPolling(true);

        pollControllerRef.current?.abort();
        const controller = new AbortController();
        pollControllerRef.current = controller;

        await pollVaultActionConfirmation(submission.txId, { signal: controller.signal });

        toast({
          title: `${mapActionLabel(action)} confirmed`,
          description: `The on-chain ${mapActionLabel(action)} for vault #${snapshot.vaultId.toString()} was confirmed.`,
        });

        clearTransactionState();
      } catch (error) {
        const classified = error instanceof VaultActionTransactionError ? error : new VaultActionTransactionError('network-error', 'Unable to submit vault action.');

        setErrorMessage(classified.message);
        setPolling(false);
      }
    },
    [address, clearTransactionState, isOwner, snapshot.vaultId, toast],
  );

  const handleDeposit = React.useCallback(() => {
    if (!depositAmount || depositAmount <= 0n) {
      setErrorMessage('Enter a valid deposit amount before submitting.');
      return;
    }

    void runTransaction('deposit', 'deposit', buildDepositArgs(snapshot.vaultId, snapshot.assetPrincipal, depositAmount));
  }, [depositAmount, runTransaction, snapshot.assetPrincipal, snapshot.vaultId]);

  const handleWithdraw = React.useCallback((amount: bigint) => {
    if (amount <= 0n) {
      setErrorMessage('Enter a valid share amount before withdrawing.');
      return;
    }

    void runTransaction('withdraw', 'withdraw', buildWithdrawArgs(snapshot.vaultId, amount));
  }, [runTransaction, snapshot.vaultId]);

  const handlePause = React.useCallback(() => {
    void runTransaction('pause', 'pause-vault', buildVaultIdArgs(snapshot.vaultId));
  }, [runTransaction, snapshot.vaultId]);

  const handleClose = React.useCallback(() => {
    void runTransaction('close', 'close-vault', buildVaultIdArgs(snapshot.vaultId));
  }, [runTransaction, snapshot.vaultId]);

  const withdrawAllShares = snapshot.ownerShareBalance;

  return (
    <Card className="border-border/70 bg-card/70">
      <CardHeader className="gap-2">
        <CardDescription>Vault actions</CardDescription>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <CardTitle className="font-[var(--font-display)] text-xl">Owner management panel</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Actions are restricted to the vault owner and use the same confirmation polling pattern as vault creation.</p>
          </div>
          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${isOwner ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-amber-500/30 bg-amber-500/10 text-amber-300'}`}>
            {isOwner ? 'Owner connected' : 'Connect owner wallet'}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!isOwner ? (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
            Connect the vault owner wallet to submit management transactions for this vault.
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-2">
          <section className="space-y-3 rounded-2xl border border-border/70 bg-background/55 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Wallet className="h-4 w-4 text-bitcoin-400" />
              Deposit additional funds
            </div>
            <div className="space-y-2">
              <Label htmlFor="vault-deposit-amount">Deposit amount</Label>
              <Input
                id="vault-deposit-amount"
                inputMode="decimal"
                value={depositInput}
                onChange={(event) => setDepositInput(event.currentTarget.value)}
                placeholder="0.00"
                disabled={!isOwner || polling}
              />
              <p className="text-xs text-muted-foreground">
                {snapshot.strategy.targetAssetSymbol} deposits route through the vault-core contract.
              </p>
            </div>
            <Button onClick={handleDeposit} disabled={!isOwner || polling || !depositInput.trim()}>
              Deposit funds
            </Button>
          </section>

          <section className="space-y-3 rounded-2xl border border-border/70 bg-background/55 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <SquareDashedBottom className="h-4 w-4 text-bitcoin-400" />
              Withdraw partial or full balance
            </div>
            <div className="space-y-2">
              <Label htmlFor="vault-withdraw-amount">Share amount</Label>
              <Input
                id="vault-withdraw-amount"
                inputMode="decimal"
                value={withdrawInput}
                onChange={(event) => setWithdrawInput(event.currentTarget.value)}
                placeholder="0.00"
                disabled={!isOwner || polling}
              />
              <p className="text-xs text-muted-foreground">
                Your current share balance: {formatMicrostx(withdrawAllShares)} shares.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => handleWithdraw(withdrawAmount ?? 0n)} disabled={!isOwner || polling || !withdrawInput.trim()}>
                Withdraw selected amount
              </Button>
              <Button variant="outline" onClick={() => handleWithdraw(withdrawAllShares)} disabled={!isOwner || polling || withdrawAllShares <= 0n}>
                Withdraw all shares
              </Button>
            </div>
          </section>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="space-y-3 rounded-2xl border border-border/70 bg-background/55 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <PauseCircle className="h-4 w-4 text-bitcoin-400" />
              Pause vault
            </div>
            <p className="text-sm text-muted-foreground">Pause the vault to stop new deposits and keep execution locked until the vault is reactivated.</p>
            <Button variant="outline" onClick={handlePause} disabled={!isOwner || polling}>
              Pause vault
            </Button>
          </section>

          <section className="space-y-3 rounded-2xl border border-border/70 bg-background/55 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Lock className="h-4 w-4 text-bitcoin-400" />
              Close vault
            </div>
            <p className="text-sm text-muted-foreground">Close the vault only after all assets have been withdrawn and the share supply is zero.</p>
            <Button variant="destructive" onClick={handleClose} disabled={!isOwner || polling}>
              Close vault
            </Button>
          </section>
        </div>

        <div className="rounded-2xl border border-border/70 bg-background/60 p-4 text-sm" aria-busy={polling}>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Transaction status</p>
          <p className="mt-1 font-medium text-foreground">
            {polling ? `Waiting for ${mapActionLabel(pendingAction)} confirmation on-chain.` : 'No active transaction pending.'}
          </p>
          <p className="mt-2 break-all rounded-lg border border-border/70 bg-card/60 px-3 py-2 text-xs text-muted-foreground">
            {transactionId ?? 'Transaction ID will appear after the wallet submits the contract call.'}
          </p>
          {transactionId ? (
            <div className="mt-3">
              <Button variant="outline" render={<Link href={buildVaultActionTxUrl(transactionId)} target="_blank" rel="noreferrer" />}>
                View on Stacks Explorer
              </Button>
            </div>
          ) : null}
        </div>

        {errorMessage ? (
          <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
            <p className="flex items-center gap-2 font-semibold text-foreground">
              <ShieldAlert className="h-4 w-4 text-destructive" />
              Vault action failed
            </p>
            <p className="mt-1 text-muted-foreground">{errorMessage}</p>
            <Button variant="outline" className="mt-3" onClick={() => setErrorMessage(null)}>
              Clear message
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
