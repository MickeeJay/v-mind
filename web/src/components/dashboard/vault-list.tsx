"use client";

import * as React from 'react';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VaultSummaryCard } from '@/components/dashboard/vault-summary-card';
import type { DashboardVault, VaultStatus } from '@/types/dashboard';

interface VaultListProps {
  vaults: DashboardVault[];
}

type SortKey = 'balance-desc' | 'balance-asc' | 'apy-desc' | 'updated-desc';

type FilterKey = 'all' | VaultStatus;

function sortVaults(vaults: DashboardVault[], sortKey: SortKey): DashboardVault[] {
  const copy = [...vaults];

  switch (sortKey) {
    case 'balance-asc':
      return copy.sort((left, right) => left.balanceUsd - right.balanceUsd);
    case 'apy-desc':
      return copy.sort((left, right) => right.estimatedApy - left.estimatedApy);
    case 'updated-desc':
      return copy.sort((left, right) => {
        const leftTime = left.lastExecutionAt ? new Date(left.lastExecutionAt).getTime() : 0;
        const rightTime = right.lastExecutionAt ? new Date(right.lastExecutionAt).getTime() : 0;
        return rightTime - leftTime;
      });
    case 'balance-desc':
    default:
      return copy.sort((left, right) => right.balanceUsd - left.balanceUsd);
  }
}

function filterVaults(vaults: DashboardVault[], filterKey: FilterKey): DashboardVault[] {
  if (filterKey === 'all') {
    return vaults;
  }

  return vaults.filter((vault) => vault.status === filterKey);
}

export function VaultList({ vaults }: VaultListProps): JSX.Element {
  const [sortBy, setSortBy] = React.useState<SortKey>('balance-desc');
  const [filterBy, setFilterBy] = React.useState<FilterKey>('all');

  const viewVaults = React.useMemo(() => {
    const filtered = filterVaults(vaults, filterBy);
    return sortVaults(filtered, sortBy);
  }, [filterBy, sortBy, vaults]);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card/50 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">Your Vaults</p>
          <p className="text-xs text-muted-foreground">Sorted by balance descending by default.</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={filterBy} onValueChange={(value) => setFilterBy(value as FilterKey)}>
            <SelectTrigger className="min-w-40" aria-label="Filter vaults by status">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="cooldown">Cooldown</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortKey)}>
            <SelectTrigger className="min-w-44" aria-label="Sort vaults">
              <SelectValue placeholder="Sort vaults" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="balance-desc">Balance: High to low</SelectItem>
              <SelectItem value="balance-asc">Balance: Low to high</SelectItem>
              <SelectItem value="apy-desc">APY: Highest first</SelectItem>
              <SelectItem value="updated-desc">Most recently executed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3">
        {viewVaults.map((vault) => (
          <VaultSummaryCard key={vault.id} vault={vault} />
        ))}
      </div>
    </section>
  );
}
