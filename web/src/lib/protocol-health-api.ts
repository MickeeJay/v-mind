import { StacksMainnet, StacksMocknet, StacksTestnet, type StacksNetwork } from '@stacks/network';
import { ClarityType, callReadOnlyFunction, uintCV, type ClarityValue, type TupleCV } from '@stacks/transactions';

import { getExpectedNetwork } from '@/config/wallet';
import { env } from '@/lib/env';

import type { ProtocolHealthPageData, ProtocolHealthSnapshot, ProtocolHealthStatus } from '@/types/protocol-health';

const VAULT_CORE_CONTRACT = 'vault-core';
const STRATEGY_EXECUTION_CONTRACT = 'strategy-execution';
const ZEST_ADAPTER = 'zest-protocol-adapter';
const ALEX_ADAPTER = 'alex-liquidity-adapter';
const STACKINGDAO_ADAPTER = 'stackingdao-adapter';
const HERMETICA_ADAPTER = 'hermetica-adapter';

interface AgentHealthResponse {
  status?: 'ok' | 'degraded' | 'down';
  lastProcessedBlockAt?: string | null;
}

interface ProtocolDefinition {
  id: ProtocolHealthSnapshot['id'];
  name: string;
  contractName: string;
  protocolId: bigint;
  rateLabel: string;
  rateFunctionName?: string;
  rateFormatter?: (value: bigint) => string;
}

const PROTOCOLS: ProtocolDefinition[] = [
  {
    id: 'zest',
    name: 'Zest',
    contractName: ZEST_ADAPTER,
    protocolId: 1n,
    rateLabel: 'Current deployed capital',
    rateFunctionName: 'get-total-deployed',
    rateFormatter: (value) => `${formatMicrostx(value)} deployed`,
  },
  {
    id: 'alex',
    name: 'ALEX',
    contractName: ALEX_ADAPTER,
    protocolId: 2n,
    rateLabel: 'LP exposure',
    rateFormatter: (value) => `${formatMicrostx(value)} LP exposure`,
  },
  {
    id: 'stackingdao',
    name: 'StackingDAO',
    contractName: STACKINGDAO_ADAPTER,
    protocolId: 3n,
    rateLabel: 'stSTX exchange rate',
    rateFunctionName: 'get-ststx-exchange-rate',
    rateFormatter: (value) => `${formatScaledRate(value)}x`,
  },
  {
    id: 'hermetica',
    name: 'Hermetica',
    contractName: HERMETICA_ADAPTER,
    protocolId: 4n,
    rateLabel: 'USDH exchange rate',
    rateFunctionName: 'get-usdh-per-susdh-rate',
    rateFormatter: (value) => `${formatScaledRate(value)}x`,
  },
];

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

function assertResponseOkUInt(value: ClarityValue, errorMessage: string): bigint {
  if (value.type !== ClarityType.ResponseOk) {
    throw new Error(errorMessage);
  }

  return assertUInt(value.value, errorMessage);
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

function getTupleField(tuple: TupleCV['data'], field: string, errorMessage: string): ClarityValue {
  const value = tuple[field];

  if (!value) {
    throw new Error(errorMessage);
  }

  return value;
}

async function callReadOnly(contractName: string, functionName: string, functionArgs: ClarityValue[], senderAddress?: string): Promise<ClarityValue> {
  return callReadOnlyFunction({
    contractAddress: env.NEXT_PUBLIC_DEPLOYER_ADDRESS,
    contractName,
    functionName,
    functionArgs,
    senderAddress: getCallReadOnlySender(senderAddress),
    network: getStacksNetworkClient(),
  });
}

function formatMicrostx(value: bigint, decimals = 6): string {
  const scale = 10n ** BigInt(decimals);
  const integer = value / scale;
  const fraction = value % scale;

  if (decimals === 0) {
    return integer.toString();
  }

  const fractionText = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
  return fractionText ? `${integer.toString()}.${fractionText}` : integer.toString();
}

function formatScaledRate(value: bigint): string {
  const scale = 100_000_000n;
  const integer = value / scale;
  const fraction = value % scale;
  const fractionText = fraction.toString().padStart(8, '0').replace(/0+$/, '');
  return fractionText ? `${integer.toString()}.${fractionText}` : integer.toString();
}

function mapAgentStatus(status?: AgentHealthResponse['status']): ProtocolHealthPageData['agentStatus'] {
  if (status === 'ok') {
    return 'running';
  }

  if (status === 'degraded') {
    return 'degraded';
  }

  if (status === 'down') {
    return 'stopped';
  }

  return 'unavailable';
}

function mapProtocolStatus(agentStatus: ProtocolHealthPageData['agentStatus'], hasData: boolean): ProtocolHealthStatus {
  if (!hasData || agentStatus === 'unavailable' || agentStatus === 'stopped') {
    return 'unavailable';
  }

  if (agentStatus === 'degraded' || agentStatus === 'starting') {
    return 'degraded';
  }

  return 'operational';
}

async function fetchAgentHealth(): Promise<AgentHealthResponse | null> {
  const url = `${env.NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, '')}/health`;

  try {
    const response = await fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!response.ok) {
      return null;
    }

    return (await response.json()) as AgentHealthResponse;
  } catch {
    return null;
  }
}

async function fetchProtocolTotals(senderAddress?: string): Promise<Record<ProtocolHealthSnapshot['id'], bigint>> {
  const nextVaultIdCv = await callReadOnly(VAULT_CORE_CONTRACT, 'get-next-vault-id', [], senderAddress);
  const nextVaultId = assertUInt(nextVaultIdCv, 'Invalid next vault ID response.');

  const totals: Record<ProtocolHealthSnapshot['id'], bigint> = {
    zest: 0n,
    alex: 0n,
    stackingdao: 0n,
    hermetica: 0n,
  };

  if (nextVaultId <= 1n) {
    return totals;
  }

  const vaultIds = Array.from({ length: Number(nextVaultId - 1n) }, (_, index) => BigInt(index + 1));

  await Promise.all(
    vaultIds.flatMap((vaultId) =>
      PROTOCOLS.map(async (protocol) => {
        const result = await callReadOnly(STRATEGY_EXECUTION_CONTRACT, 'get-protocol-position', [uintCV(vaultId), uintCV(protocol.protocolId)], senderAddress);
        const position = assertOptionalTuple(result, `Invalid protocol position response for vault ${vaultId.toString()}.`);

        if (!position) {
          return;
        }

        const amount = assertUInt(getTupleField(position, 'allocated-assets', 'Missing allocated assets field.'), 'Invalid allocated assets value.');
        totals[protocol.id] += amount;
      }),
    ),
  );

  return totals;
}

async function fetchProtocolRate(protocol: ProtocolDefinition, senderAddress?: string): Promise<string> {
  if (!protocol.rateFunctionName) {
    return 'Unavailable';
  }

  const response = await callReadOnly(protocol.contractName, protocol.rateFunctionName, [], senderAddress);

  if (protocol.id === 'zest') {
    return `${formatMicrostx(assertResponseOkUInt(response, 'Invalid Zest rate response.'))} deployed`;
  }

  return protocol.rateFormatter?.(assertResponseOkUInt(response, `Invalid ${protocol.name} rate response.`)) ?? 'Unavailable';
}

function buildProtocolSnapshot(protocol: ProtocolDefinition, agentStatus: ProtocolHealthPageData['agentStatus'], total: bigint, rateValue: string, checkedAt: string): ProtocolHealthSnapshot {
  return {
    id: protocol.id,
    name: protocol.name,
    contractPrincipal: `${env.NEXT_PUBLIC_DEPLOYER_ADDRESS}.${protocol.contractName}`,
    tvlMicrostx: total,
    rateLabel: protocol.rateLabel,
    rateValue,
    status: mapProtocolStatus(agentStatus, true),
    lastUpdatedAt: checkedAt,
    explorerUrl: `https://explorer.hiro.so/address/${env.NEXT_PUBLIC_DEPLOYER_ADDRESS}.${protocol.contractName}?chain=${getExpectedNetwork() === 'mainnet' ? 'mainnet' : 'testnet'}`,
  };
}

export async function fetchProtocolHealthPageData(senderAddress?: string): Promise<ProtocolHealthPageData> {
  const checkedAt = new Date().toISOString();
  const [agentHealth, totals] = await Promise.all([fetchAgentHealth(), fetchProtocolTotals(senderAddress)]);
  const agentStatus = mapAgentStatus(agentHealth?.status);

  const snapshots = await Promise.all(
    PROTOCOLS.map(async (protocol) => {
      const rateValue = await fetchProtocolRate(protocol, senderAddress).catch(() => 'Unavailable');
      const snapshot = buildProtocolSnapshot(protocol, agentStatus, totals[protocol.id], rateValue, agentHealth?.lastProcessedBlockAt ?? checkedAt);

      return {
        ...snapshot,
        status:
          rateValue === 'Unavailable' || snapshot.tvlMicrostx < 0n
            ? 'unavailable'
            : agentStatus === 'degraded'
              ? 'degraded'
              : agentStatus === 'unavailable'
                ? 'unavailable'
                : 'operational',
      } satisfies ProtocolHealthSnapshot;
    }),
  );

  return {
    checkedAt,
    agentStatus,
    protocols: snapshots,
  };
}
