import { useQuery } from '@tanstack/react-query';

import { fetchVaultAllocation } from '@/lib/vault-detail-api';

export function useVaultAllocationQuery(vaultId: bigint) {
  return useQuery({
    queryKey: ['vault-allocation', vaultId.toString()],
    queryFn: () => fetchVaultAllocation(vaultId),
    enabled: vaultId > 0n,
  });
}