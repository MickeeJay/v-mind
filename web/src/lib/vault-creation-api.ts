import { StacksMainnet, StacksMocknet, StacksTestnet, type StacksNetwork } from '@stacks/network';
import {
  ClarityType,
  callReadOnlyFunction,
  principalCV,
  principalToString,
  uintCV,
  type ClarityValue,
  type TupleCV,
} from '@stacks/transactions';


import { getExpectedNetwork } from '@/config/wallet';
import { env } from '@/lib/env';

import type {
  VaultCreationPricing,
  VaultCreationProtocolConfig,
  VaultStrategy,
  WalletBalanceSnapshot,
} from '@/types/vault-creation';

const STRATEGY_REGISTRY_CONTRACT = 'strategy-registry';
const PROTOCOL_CONFIG_CONTRACT = 'protocol-config';
const VAULT_CORE_CONTRACT = 'vault-core';
const SHARE_SCALING_FACTOR = 1_000_000n;

function getStacksNetworkClient(): StacksNetwork {
  const network = getExpectedNetwork();
  const url = env.NEXT_PUBLIC_STACKS_API_URL;

  if (network === 'mainnet') {
    return new StacksMainnet({ url });
  }

  if (network === 'devnet') {
    return new StacksMocknet({ url });
  }

  return new StacksTestnet({ url });
}

function getCallReadOnlySender(senderAddress?: string): string {
  return senderAddress?.trim() || env.NEXT_PUBLIC_DEPLOYER_ADDRESS;
}

function assertUInt(value: ClarityValue, errorMessage: string): bigint {
  if (value.type !== ClarityType.UInt) {
    throw new Error(errorMessage);
  }

  return value.value;
}

function assertAscii(value: ClarityValue, errorMessage: string): string {
  if (value.type !== ClarityType.StringASCII && value.type !== ClarityType.StringUTF8) {
    throw new Error(errorMessage);
  }

  return value.data;
}

function assertPrincipal(value: ClarityValue, errorMessage: string): string {
  if (value.type !== ClarityType.PrincipalContract && value.type !== ClarityType.PrincipalStandard) {
    throw new Error(errorMessage);
  }

  return principalToString(value);
}

function assertBool(value: ClarityValue, errorMessage: string): boolean {
  if (value.type === ClarityType.BoolTrue) {
    return true;
  }

  if (value.type === ClarityType.BoolFalse) {
    return false;
  }

  throw new Error(errorMessage);
}

function assertOptionalTuple(value: ClarityValue, errorMessage: string): TupleCV['data'] | null {
  if (value.type === ClarityType.OptionalNone) {
    return null;
  }

  if (value.type !== ClarityType.OptionalSome || value.value.type !== ClarityType.Tuple) {
    throw new Error(errorMessage);
  }

  return value.value.data;
}

function assertResponseOkUInt(value: ClarityValue, errorMessage: string): bigint {
  if (value.type !== ClarityType.ResponseOk) {
    throw new Error(errorMessage);
  }

  return assertUInt(value.value, errorMessage);
}

function getTupleField(tuple: TupleCV['data'], field: string, errorMessage: string): ClarityValue {
  const value = tuple[field];

  if (!value) {
    throw new Error(errorMessage);
  }

  return value;
}

async function callReadOnly(
  contractName: string,
  functionName: string,
  functionArgs: ClarityValue[],
  senderAddress?: string,
): Promise<ClarityValue> {
  return callReadOnlyFunction({
    contractAddress: env.NEXT_PUBLIC_DEPLOYER_ADDRESS,
    contractName,
    functionName,
    functionArgs,
    senderAddress: getCallReadOnlySender(senderAddress),
    network: getStacksNetworkClient(),
  });
}

function toRiskLabel(riskTier: bigint): VaultStrategy['riskLabel'] {
  if (riskTier === 1n) {
    return 'Conservative';
  }

  if (riskTier === 3n) {
    return 'Aggressive';
  }

  return 'Moderate';
}

function toEstimatedApyRange(strategyType: bigint, riskTier: bigint): string {
  if (strategyType === 4n) {
    return '0.00% - 2.00%';
  }

  if (riskTier === 1n) {
    return '3.50% - 6.00%';
  }

  if (riskTier === 3n) {
    return '11.00% - 18.00%';
  }

  if (strategyType === 2n) {
    return '7.00% - 12.00%';
  }

  return '6.00% - 10.50%';
}

function toStrategyDescription(strategyType: bigint): string {
  if (strategyType === 2n) {
    return 'Rebalances across integrated venues to maintain target allocation bands while minimizing drift.';
  }

  if (strategyType === 3n) {
    return 'Accumulates position exposure over time in timed tranches to smooth entry volatility.';
  }

  if (strategyType === 4n) {
    return 'Prioritizes principal defense and exits to safe posture when risk guardrails are triggered.';
  }

  return 'Deploys assets to vetted yield adapters and compounds returns while protocol safeguards remain active.';
}

interface SupportedAssetSnapshot {
  symbol: string;
  minDepositMicrostx: bigint;
  active: boolean;
}

async function getSupportedAssetSnapshot(assetPrincipal: string, senderAddress?: string): Promise<SupportedAssetSnapshot | null> {
  const result = await callReadOnly(
    PROTOCOL_CONFIG_CONTRACT,
    'get-supported-asset',
    [principalCV(assetPrincipal)],
    senderAddress,
  );

  const tupleData = assertOptionalTuple(result, 'Invalid supported asset response from protocol-config contract.');

  if (!tupleData) {
    return null;
  }

  return {
    symbol: assertAscii(
      getTupleField(tupleData, 'symbol', 'Missing symbol field in protocol config supported asset response.'),
      'Invalid asset symbol type in protocol config.',
    ),
    minDepositMicrostx: assertUInt(
      getTupleField(
        tupleData,
        'min-deposit-microstx',
        'Missing min deposit field in protocol config supported asset response.',
      ),
      'Invalid min deposit type in protocol config.',
    ),
    active: assertBool(
      getTupleField(tupleData, 'active', 'Missing active field in protocol config supported asset response.'),
      'Invalid asset active flag in protocol config.',
    ),
  };
}

export async function fetchAvailableStrategies(senderAddress?: string): Promise<VaultStrategy[]> {
  const countCv = await callReadOnly(STRATEGY_REGISTRY_CONTRACT, 'get-total-strategies', [], senderAddress);
  const totalStrategies = assertUInt(countCv, 'Invalid strategy count response from strategy registry.');

  const strategyTuples: Array<{ id: bigint; tuple: TupleCV['data'] }> = [];

  for (let strategyId = 1n; strategyId <= totalStrategies; strategyId += 1n) {
    const strategyCv = await callReadOnly(
      STRATEGY_REGISTRY_CONTRACT,
      'get-strategy-by-id',
      [uintCV(strategyId)],
      senderAddress,
    );

    const strategyTuple = assertOptionalTuple(strategyCv, `Invalid strategy payload for strategy ID ${strategyId}.`);

    if (!strategyTuple) {
      continue;
    }

    strategyTuples.push({ id: strategyId, tuple: strategyTuple });
  }

  const hydratedStrategies = await Promise.all(
    strategyTuples.map(async ({ id, tuple }) => {
      const strategyType = assertUInt(
        getTupleField(tuple, 'strategy-type', `Missing strategy type for strategy ID ${id}.`),
        `Invalid strategy type for strategy ID ${id}.`,
      );
      const riskTier = assertUInt(
        getTupleField(tuple, 'risk-tier', `Missing risk tier for strategy ID ${id}.`),
        `Invalid risk tier for strategy ID ${id}.`,
      );
      const targetProtocolPrincipal = assertPrincipal(
        getTupleField(tuple, 'target-protocol', `Missing target protocol for strategy ID ${id}.`),
        `Invalid target protocol principal for strategy ID ${id}.`,
      );
      const active = assertBool(
        getTupleField(tuple, 'active', `Missing active flag for strategy ID ${id}.`),
        `Invalid active flag for strategy ID ${id}.`,
      );

      const asset = await getSupportedAssetSnapshot(targetProtocolPrincipal, senderAddress);

      return {
        id,
        name: assertAscii(
          getTupleField(tuple, 'strategy-name', `Missing strategy name for strategy ID ${id}.`),
          `Invalid strategy name for strategy ID ${id}.`,
        ),
        strategyType,
        riskTier,
        riskLabel: toRiskLabel(riskTier),
        targetProtocolPrincipal,
        targetAssetSymbol: asset?.symbol ?? 'STX',
        targetAssetMinDepositMicrostx: asset?.minDepositMicrostx ?? 0n,
        estimatedApyRange: toEstimatedApyRange(strategyType, riskTier),
        description: toStrategyDescription(strategyType),
        active: active && (asset?.active ?? true),
      } satisfies VaultStrategy;
    }),
  );

  return hydratedStrategies.filter((strategy) => strategy.active);
}

export async function fetchVaultCreationProtocolConfig(senderAddress?: string): Promise<VaultCreationProtocolConfig> {
  const [minimumDepositCv, feeCv] = await Promise.all([
    callReadOnly(PROTOCOL_CONFIG_CONTRACT, 'get-minimum-deposit-microstx', [], senderAddress),
    callReadOnly(PROTOCOL_CONFIG_CONTRACT, 'get-protocol-performance-fee-bps', [], senderAddress),
  ]);

  return {
    minimumDepositMicrostx: assertUInt(minimumDepositCv, 'Invalid minimum deposit response from protocol config.'),
    performanceFeeBps: assertUInt(feeCv, 'Invalid protocol fee response from protocol config.'),
  };
}

export async function fetchVaultCreationPricing(senderAddress?: string): Promise<VaultCreationPricing> {
  const nextVaultIdCv = await callReadOnly(VAULT_CORE_CONTRACT, 'get-next-vault-id', [], senderAddress);
  const nextVaultId = assertUInt(nextVaultIdCv, 'Invalid next vault ID response from vault-core contract.');

  const priceCv = await callReadOnly(VAULT_CORE_CONTRACT, 'get-vault-price-per-share', [uintCV(nextVaultId)], senderAddress);

  return {
    nextVaultId,
    pricePerShareScaled: assertResponseOkUInt(priceCv, 'Invalid vault share price response from vault-core contract.'),
    shareScale: SHARE_SCALING_FACTOR,
  };
}

export async function fetchWalletBalanceSnapshot(address: string): Promise<WalletBalanceSnapshot> {
  const trimmed = address.trim();

  if (!trimmed) {
    throw new Error('Wallet address is required to fetch balance.');
  }

  const apiRoot = env.NEXT_PUBLIC_STACKS_API_URL.replace(/\/$/, '');
  const response = await fetch(`${apiRoot}/extended/v1/address/${trimmed}/balances`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Unable to fetch wallet balance (status ${response.status}).`);
  }

  const payload = (await response.json()) as { stx?: { balance?: string } };
  const stxBalance = payload.stx?.balance;

  if (!stxBalance || !/^\d+$/.test(stxBalance)) {
    throw new Error('Unexpected wallet balance response format.');
  }

  return {
    stxBalanceMicrostx: BigInt(stxBalance),
  };
}
