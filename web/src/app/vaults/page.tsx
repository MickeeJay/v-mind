import { VaultCreationFlow } from '@/components/vault-creation/vault-creation-flow';

interface VaultsPageProps {
  searchParams?: {
    strategyId?: string | string[];
  };
}

function parseStrategyId(strategyId: string | string[] | undefined): bigint | null {
  const value = Array.isArray(strategyId) ? strategyId[0] : strategyId;

  if (!value) {
    return null;
  }

  try {
    const parsed = BigInt(value);
    return parsed > 0n ? parsed : null;
  } catch {
    return null;
  }
}

export default function VaultsPage({ searchParams }: VaultsPageProps): JSX.Element {
  return <VaultCreationFlow initialStrategyId={parseStrategyId(searchParams?.strategyId)} />;
}
