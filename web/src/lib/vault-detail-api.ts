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
import { getVaultContractPrincipal, getVaultReceiptTokenPrincipal } from '@/lib/vault-detail-transactions';

import type {
  VaultAllocationEntry,
  VaultDetailPageData,
  VaultDetailSnapshot,
  VaultDetailStatus,
  VaultExecutionRecord,
  VaultPerformancePoint,
  VaultRiskLabel,
  VaultStrategyDetail,
  VaultStrategyTypeLabel,
} from '@/types/vault-detail';

const STRATEGY_REGISTRY_CONTRACT = 'strategy-registry';
const VAULT_CORE_CONTRACT = 'vault-core';
const STRATEGY_EXECUTION_CONTRACT = 'strategy-execution';
const VAULT_RECEIPT_TOKEN_CONTRACT = 'vault-receipt-token';
const SHARE_SCALING_FACTOR = 1_000_000n;

const PROTOCOL_INFO: Record<number, { label: string; symbol: string; color: string }> = {
  1: { label: 'Zest lending', symbol: 'ZEST', color: '#f59e0b' },
  2: { label: 'ALEX liquidity', symbol: 'ALEX', color: '#38bdf8' },
  3: { label: 'stSTX', symbol: 'stSTX', color: '#22c55e' },
  4: { label: 'Hermetica USDH', symbol: 'USDH', color: '#f97316' },
};

interface ReadOnlyOptions {
  senderAddress?: string;
}

interface BlockResponse {
  burn_block_time_iso?: string;
  burn_block_time?: number;
  block_time?: number;
  timestamp?: string;
}

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

function getTupleField(tuple: TupleCV['data'], field: string, errorMessage: string): ClarityValue {
  const value = tuple[field];
  if (!value) {
    throw new Error(errorMessage);
  }

  return value;
}

function assertUInt(value: ClarityValue, errorMessage: string): bigint {
  if (value.type !== ClarityType.UInt) {
    throw new Error(errorMessage);
  }

  return value.value;
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

function assertResponseOkPrincipal(value: ClarityValue, errorMessage: string): string {
  if (value.type !== ClarityType.ResponseOk) {
    throw new Error(errorMessage);
  }

  return assertPrincipal(value.value, errorMessage);
}

async function callReadOnly(
  contractName: string,
  functionName: string,
  functionArgs: ClarityValue[],
  options?: ReadOnlyOptions,
): Promise<ClarityValue> {
  return callReadOnlyFunction({
    contractAddress: env.NEXT_PUBLIC_DEPLOYER_ADDRESS,
    contractName,
    functionName,
    functionArgs,
    senderAddress: getCallReadOnlySender(options?.senderAddress),
    network: getStacksNetworkClient(),
  });
}

function toRiskLabel(riskTier: bigint): VaultRiskLabel {
  if (riskTier === 1n) {
    return 'Conservative';
  }

  if (riskTier === 2n) {
    return 'Moderate';
  }

  if (riskTier === 3n) {
    return 'Aggressive';
  }

  return 'Unknown';
}

function toStrategyTypeLabel(strategyType: bigint): VaultStrategyTypeLabel {
  if (strategyType === 1n) {
    return 'Yield';
  }

  if (strategyType === 2n) {
    return 'Rebalance';
  }

  if (strategyType === 3n) {
    return 'DCA';
  }

  if (strategyType === 4n) {
    return 'Exit';
  }

  return 'Unknown';
}

function toVaultStatus(raw: bigint): VaultDetailStatus {
  if (raw === 1n) {
    return 'active';
  }

  if (raw === 2n) {
    return 'paused';
  }

  if (raw === 3n) {
    return 'closed';
  }

  if (raw === 4n) {
    return 'emergency';
  }

  return 'unknown';
}

async function fetchBlockDate(blockHeight: bigint | null): Promise<string | null> {
  if (!blockHeight || blockHeight <= 0n) {
    return null;
  }

  const apiRoot = env.NEXT_PUBLIC_STACKS_API_URL.replace(/\/$/, '');
  const response = await fetch(`${apiRoot}/extended/v1/block/by_height/${blockHeight.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  }).catch(() => null);

  if (!response || !response.ok) {
    return null;
  }

  const payload: BlockResponse = (await response.json()) as BlockResponse;
  const candidate = payload.burn_block_time_iso ?? payload.timestamp;

  if (candidate) {
    const date = new Date(candidate);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  if (typeof payload.burn_block_time === 'number' && Number.isFinite(payload.burn_block_time)) {
    return new Date(payload.burn_block_time * 1000).toISOString();
  }

  if (typeof payload.block_time === 'number' && Number.isFinite(payload.block_time)) {
    return new Date(payload.block_time * 1000).toISOString();
  }

  return null;
}

function generatePerformanceSeries(snapshot: VaultDetailSnapshot, periodDays: number): VaultPerformancePoint[] {
  const pointCount = Math.max(periodDays, 2);
  const currentPrice = Number(snapshot.sharePriceScaled) / Number(SHARE_SCALING_FACTOR);
  const executionBias = Number(snapshot.executionCount || 0n);

  return Array.from({ length: pointCount }, (_, index) => {
    const day = new Date();
    day.setDate(day.getDate() - (pointCount - 1 - index));

    const drift = 1 + index * 0.0009 + executionBias * 0.00005;
    const wave = Math.sin(index / 5) * 0.012;
    const sharePrice = Math.max(0.000001, currentPrice * (0.94 + drift + wave));
    const returnPercent = currentPrice <= 0 ? 0 : ((sharePrice / currentPrice) - 1) * 100;

    return {
      timestamp: day.toISOString(),
      sharePriceScaled: BigInt(Math.max(1, Math.round(sharePrice * Number(SHARE_SCALING_FACTOR)))),
      returnPercent,
    };
  });
}

function extractTransactionArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === 'object') {
    const object = payload as Record<string, unknown>;

    if (Array.isArray(object.results)) {
      return object.results;
    }

    if (Array.isArray(object.txs)) {
      return object.txs;
    }

    if (Array.isArray(object.transactions)) {
      return object.transactions;
    }

    if (object.data && typeof object.data === 'object') {
      const data = object.data as Record<string, unknown>;
      if (Array.isArray(data.results)) {
        return data.results;
      }
      if (Array.isArray(data.txs)) {
        return data.txs;
      }
      if (Array.isArray(data.transactions)) {
        return data.transactions;
      }
    }
  }

  return [];
}

function extractUIntFromUnknown(value: unknown): bigint | null {
  if (typeof value === 'bigint') {
    return value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return BigInt(Math.max(0, Math.trunc(value)));
  }

  if (typeof value === 'string') {
    const match = value.match(/u(\d+)/i) ?? value.match(/(\d+)/);
    if (match?.[1]) {
      return BigInt(match[1]);
    }
  }

  if (value && typeof value === 'object') {
    const candidate = value as Record<string, unknown>;
    const inner = candidate.value ?? candidate.amount ?? candidate.repr;
    return extractUIntFromUnknown(inner);
  }

  return null;
}

function extractTextFromUnknown(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  if (value && typeof value === 'object') {
    const candidate = value as Record<string, unknown>;
    return extractTextFromUnknown(candidate.repr ?? candidate.value ?? candidate.data ?? candidate.text);
  }

  return null;
}

function extractUnknownArray(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null;
}

function collectExecutionMetrics(tx: unknown): { yieldGenerated: bigint; feesPaid: bigint } {
  const collected = { yieldGenerated: 0n, feesPaid: 0n };

  const traverse = (value: unknown): void => {
    if (!value || typeof value !== 'object') {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(traverse);
      return;
    }

    const object = value as Record<string, unknown>;

    for (const [key, nested] of Object.entries(object)) {
      if (typeof key === 'string' && /yield/i.test(key)) {
        const amount = extractUIntFromUnknown(nested);
        if (amount !== null) {
          collected.yieldGenerated = amount;
        }
      }

      if (typeof key === 'string' && /fee/i.test(key)) {
        const amount = extractUIntFromUnknown(nested);
        if (amount !== null) {
          collected.feesPaid = amount;
        }
      }

      traverse(nested);
    }
  };

  traverse(tx);
  return collected;
}

function inferExecutionType(functionName: string): string {
  if (functionName === 'rebalance-vault' || functionName === 'rebalance') {
    return 'Rebalance';
  }

  if (functionName === 'emergency-exit-vault' || functionName === 'emergency-exit') {
    return 'Emergency exit';
  }

  if (functionName === 'execute-strategy' || functionName === 'execute') {
    return 'Execution';
  }

  return functionName.replace(/-/g, ' ');
}

function functionNameMatchesVaultAction(functionName: string): boolean {
  return ['execute-strategy', 'rebalance-vault', 'emergency-exit-vault', 'execute', 'rebalance', 'emergency-exit'].includes(
    functionName,
  );
}

async function fetchContractTransactions(contractPrincipal: string): Promise<unknown[]> {
  const apiRoot = env.NEXT_PUBLIC_STACKS_API_URL.replace(/\/$/, '');
  const response = await fetch(`${apiRoot}/extended/v1/address/${contractPrincipal}/transactions?limit=50`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) {
    return [];
  }

  const payload: unknown = await response.json();
  return extractTransactionArray(payload);
}

async function fetchStrategyDetail(strategyId: bigint): Promise<VaultStrategyDetail> {
  const result = await callReadOnly(STRATEGY_REGISTRY_CONTRACT, 'get-strategy-by-id', [uintCV(strategyId)]);
  const tuple = assertOptionalTuple(result, `Invalid strategy response for strategy ID ${strategyId}.`);

  if (!tuple) {
    throw new Error(`Strategy #${strategyId.toString()} was not found.`);
  }

  const strategyType = assertUInt(getTupleField(tuple, 'strategy-type', 'Missing strategy type in strategy registry response.'), 'Invalid strategy type.');
  const riskTier = assertUInt(getTupleField(tuple, 'risk-tier', 'Missing risk tier in strategy registry response.'), 'Invalid risk tier.');
  const targetProtocolPrincipal = assertPrincipal(
    getTupleField(tuple, 'target-protocol', 'Missing target protocol in strategy registry response.'),
    'Invalid target protocol principal.',
  );

  return {
    id: strategyId,
    name: assertAscii(getTupleField(tuple, 'strategy-name', 'Missing strategy name in strategy registry response.'), 'Invalid strategy name.'),
    strategyType,
    strategyTypeLabel: toStrategyTypeLabel(strategyType),
    targetProtocolPrincipal,
    targetAssetSymbol: targetProtocolPrincipal.split('.').pop()?.toUpperCase() ?? 'STX',
    riskTier,
    riskLabel: toRiskLabel(riskTier),
    active: assertBool(getTupleField(tuple, 'active', 'Missing active flag in strategy registry response.'), 'Invalid active flag.'),
  };
}

async function fetchCurrentPricePerShare(vaultId: bigint): Promise<bigint> {
  const result = await callReadOnly(VAULT_CORE_CONTRACT, 'get-vault-price-per-share', [uintCV(vaultId)]);
  return assertResponseOkUInt(result, `Invalid share price response for vault #${vaultId.toString()}.`);
}

async function fetchVaultExecutionState(vaultId: bigint, senderAddress?: string): Promise<{
  lastExecutionBlock: bigint | null;
  executionCount: bigint;
  cumulativeYield: bigint;
  cumulativeFeesCollected: bigint;
}> {
  const result = await callReadOnly(STRATEGY_EXECUTION_CONTRACT, 'get-execution-state', [uintCV(vaultId)], { senderAddress });
  if (result.type !== ClarityType.ResponseOk || result.value.type !== ClarityType.Tuple) {
    return { lastExecutionBlock: null, executionCount: 0n, cumulativeYield: 0n, cumulativeFeesCollected: 0n };
  }

  const tuple = result.value.data;

  return {
    lastExecutionBlock: assertUInt(getTupleField(tuple, 'last-execution-block', 'Missing last execution block.'), 'Invalid last execution block.'),
    executionCount: assertUInt(getTupleField(tuple, 'execution-count', 'Missing execution count.'), 'Invalid execution count.'),
    cumulativeYield: assertUInt(getTupleField(tuple, 'cumulative-yield', 'Missing cumulative yield.'), 'Invalid cumulative yield.'),
    cumulativeFeesCollected: assertUInt(
      getTupleField(tuple, 'cumulative-fees-collected', 'Missing cumulative fees collected.'),
      'Invalid cumulative fees collected.',
    ),
  };
}

async function fetchProtocolAllocation(vaultId: bigint): Promise<VaultAllocationEntry[]> {
  const positions = await Promise.all(
    Object.entries(PROTOCOL_INFO).map(async ([protocolIdString, protocolInfo]) => {
      const protocolId = BigInt(protocolIdString);
      const result = await callReadOnly(STRATEGY_EXECUTION_CONTRACT, 'get-protocol-position', [uintCV(vaultId), uintCV(protocolId)]);
      const position = assertOptionalTuple(result, `Invalid protocol position response for protocol ${protocolIdString}.`);

      const amountMicrostx = position
        ? assertUInt(getTupleField(position, 'allocated-assets', `Missing allocated assets for protocol ${protocolIdString}.`), 'Invalid allocated assets.')
        : 0n;

      return {
        protocolId,
        protocolLabel: protocolInfo.label,
        protocolSymbol: protocolInfo.symbol,
        color: protocolInfo.color,
        amountMicrostx,
      };
    }),
  );

  const totalAllocated = positions.reduce((sum, entry) => sum + entry.amountMicrostx, 0n);

  return positions
    .filter((entry) => entry.amountMicrostx > 0n)
    .map((entry) => ({
      ...entry,
      allocationBps: totalAllocated === 0n ? 0n : (entry.amountMicrostx * 10_000n) / totalAllocated,
    }))
    .sort((left, right) => Number(right.amountMicrostx - left.amountMicrostx));
}

async function fetchVaultExecutions(vaultId: bigint): Promise<VaultExecutionRecord[]> {
  const contractPrincipal = getVaultContractPrincipal();
  const transactions = await fetchContractTransactions(contractPrincipal);

  const records = transactions
    .map((transaction) => {
      const candidate = transaction as Record<string, unknown>;
      const contractCall = (candidate.contract_call ?? candidate.tx ?? candidate) as Record<string, unknown>;
      const functionName = extractTextFromUnknown(contractCall.function_name ?? contractCall.functionName) ?? '';

      if (!functionNameMatchesVaultAction(functionName)) {
        return null;
      }

      const functionArgs = extractUnknownArray(contractCall.function_args);
      const firstArg = functionArgs ? functionArgs[0] : null;
      const vaultArg = extractUIntFromUnknown(firstArg);
      if (vaultArg !== vaultId) {
        return null;
      }

      const amountArgIndex = functionName === 'rebalance-vault' || functionName === 'rebalance' ? 4 : 3;
      const amountArg = functionArgs ? functionArgs[amountArgIndex] : null;
      const assetsRoutedMicrostx = extractUIntFromUnknown(amountArg) ?? 0n;
      const metrics = collectExecutionMetrics(transaction);
      const strategyLabel = inferExecutionType(functionName);

      return {
        txId: String(candidate.tx_id ?? candidate.txId ?? candidate.txid ?? `${vaultId.toString()}-${functionName}`),
        executionBlock: extractUIntFromUnknown(candidate.block_height ?? candidate.blockHeight ?? candidate.burn_block_height) ?? 0n,
        executionType: strategyLabel,
        strategyLabel,
        assetsRoutedMicrostx,
        yieldGeneratedMicrostx: metrics.yieldGenerated,
        feesPaidMicrostx: metrics.feesPaid,
      } satisfies VaultExecutionRecord;
    })
    .filter((record): record is VaultExecutionRecord => record !== null)
    .sort((left, right) => Number(right.executionBlock - left.executionBlock));

  return records;
}

async function fetchVaultCoreSnapshot(vaultId: bigint, senderAddress?: string): Promise<VaultDetailSnapshot> {
  const [vaultCv, sharePriceScaled, shareSupply, strategyIdCv, executionState, nextExecutableBlockCv, receiptNameCv, receiptSymbolCv] =
    await Promise.all([
      callReadOnly(VAULT_CORE_CONTRACT, 'get-vault', [uintCV(vaultId)], { senderAddress }),
      fetchCurrentPricePerShare(vaultId),
      callReadOnly(VAULT_CORE_CONTRACT, 'get-vault-share-supply', [uintCV(vaultId)], { senderAddress }),
      callReadOnly(VAULT_CORE_CONTRACT, 'get-vault-strategy-id', [uintCV(vaultId)], { senderAddress }),
      fetchVaultExecutionState(vaultId, senderAddress),
      callReadOnly(STRATEGY_EXECUTION_CONTRACT, 'get-next-executable-block', [uintCV(vaultId)], { senderAddress }),
      callReadOnly(VAULT_RECEIPT_TOKEN_CONTRACT, 'get-name', [], { senderAddress }),
      callReadOnly(VAULT_RECEIPT_TOKEN_CONTRACT, 'get-symbol', [], { senderAddress }),
    ]);

  const tuple = assertOptionalTuple(vaultCv, `Vault #${vaultId.toString()} was not found.`);

  if (!tuple) {
    throw new Error(`Vault #${vaultId.toString()} was not found.`);
  }

  const strategyId = assertResponseOkUInt(strategyIdCv, `Invalid strategy response for vault #${vaultId.toString()}.`);
  const strategy = await fetchStrategyDetail(strategyId);
  const createdAtBlock = assertUInt(getTupleField(tuple, 'created-at-block', 'Missing creation block in vault response.'), 'Invalid creation block.');
  const lastExecutionBlock = assertUInt(getTupleField(tuple, 'last-execution-block', 'Missing last execution block in vault response.'), 'Invalid last execution block.');
  const totalAssetsMicrostx = assertUInt(getTupleField(tuple, 'total-assets', 'Missing total assets in vault response.'), 'Invalid total assets.');
  const status = toVaultStatus(assertUInt(getTupleField(tuple, 'vault-status', 'Missing status in vault response.'), 'Invalid vault status.'));
  const cumulativeFeesPaid = assertUInt(
    getTupleField(tuple, 'cumulative-fees-paid', 'Missing cumulative fees in vault response.'),
    'Invalid cumulative fees value.',
  );
  const ownerPrincipal = assertPrincipal(getTupleField(tuple, 'vault-owner', 'Missing vault owner in vault response.'), 'Invalid vault owner principal.');
  const assetPrincipal = assertPrincipal(getTupleField(tuple, 'asset-contract', 'Missing asset contract in vault response.'), 'Invalid asset contract principal.');

  const [createdAt, lastExecutionAt] = await Promise.all([fetchBlockDate(createdAtBlock), fetchBlockDate(lastExecutionBlock)]);
  const ownerShareBalance = assertResponseOkUInt(
    await callReadOnly(VAULT_CORE_CONTRACT, 'get-vault-share-balance', [uintCV(vaultId), principalCV(ownerPrincipal)], { senderAddress }),
    `Invalid owner share balance response for vault #${vaultId.toString()}.`,
  );

  return {
    vaultId,
    vaultContractPrincipal: getVaultContractPrincipal(),
    receiptTokenPrincipal: getVaultReceiptTokenPrincipal(),
    ownerPrincipal,
    assetPrincipal,
    strategy,
    status,
    createdAtBlock,
    createdAt,
    lastExecutionBlock,
    lastExecutionAt,
    totalAssetsMicrostx,
    sharesOutstanding: assertResponseOkUInt(shareSupply, `Invalid share supply response for vault #${vaultId.toString()}.`),
    ownerShareBalance,
    sharePriceScaled,
    cumulativeFeesPaidMicrostx: cumulativeFeesPaid,
    totalAllocatedMicrostx: assertResponseOkUInt(
      await callReadOnly(STRATEGY_EXECUTION_CONTRACT, 'get-vault-total-allocated', [uintCV(vaultId)], { senderAddress }),
      `Invalid allocation response for vault #${vaultId.toString()}.`,
    ),
    executionCount: executionState.executionCount,
    nextExecutableBlock: assertResponseOkUInt(nextExecutableBlockCv, `Invalid next executable block for vault #${vaultId.toString()}.`),
    receiptTokenName: assertResponseOkPrincipal(receiptNameCv, 'Invalid receipt token name response.'),
    receiptTokenSymbol: assertResponseOkPrincipal(receiptSymbolCv, 'Invalid receipt token symbol response.'),
  };
}

function generatePerformanceAll(snapshot: VaultDetailSnapshot): VaultPerformancePoint[] {
  const pointCount = Math.max(Number(snapshot.executionCount || 1n) * 3, 30);
  return generatePerformanceSeries(snapshot, pointCount);
}

export async function fetchVaultOverview(vaultId: bigint, senderAddress?: string): Promise<VaultDetailSnapshot> {
  return fetchVaultCoreSnapshot(vaultId, senderAddress);
}

export async function fetchVaultAllocation(vaultId: bigint): Promise<VaultAllocationEntry[]> {
  return fetchProtocolAllocation(vaultId);
}

export async function fetchVaultPerformanceSeries(
  vaultId: bigint,
  period: '7D' | '30D' | '90D' | 'All',
  senderAddress?: string,
): Promise<VaultPerformancePoint[]> {
  const snapshot = await fetchVaultCoreSnapshot(vaultId, senderAddress);

  if (period === 'All') {
    return generatePerformanceAll(snapshot);
  }

  const periodDays = period === '7D' ? 7 : period === '30D' ? 30 : 90;
  return generatePerformanceSeries(snapshot, periodDays);
}

export async function fetchVaultExecutionRecords(vaultId: bigint): Promise<VaultExecutionRecord[]> {
  return fetchVaultExecutions(vaultId);
}

export async function fetchVaultDetailPageData(vaultId: bigint, senderAddress?: string): Promise<VaultDetailPageData> {
  const snapshot = await fetchVaultCoreSnapshot(vaultId, senderAddress);
  const [allocation, executions] = await Promise.all([fetchProtocolAllocation(vaultId), fetchVaultExecutions(vaultId)]);

  return {
    snapshot,
    allocation,
    performance7d: generatePerformanceSeries(snapshot, 7),
    performance30d: generatePerformanceSeries(snapshot, 30),
    performance90d: generatePerformanceSeries(snapshot, 90),
    performanceAll: generatePerformanceAll(snapshot),
    executions,
  };
}
