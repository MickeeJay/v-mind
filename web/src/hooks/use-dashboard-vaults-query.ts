import { useQuery } from '@tanstack/react-query';

import { fetchDashboardVaults } from '@/lib/dashboard-api';

export function useDashboardVaultsQuery(ownerAddress: string | null) {
  return useQuery({
    queryKey: ['dashboard-vaults', ownerAddress],
    queryFn: () => fetchDashboardVaults(ownerAddress ?? ''),
    enabled: Boolean(ownerAddress),
  });
}