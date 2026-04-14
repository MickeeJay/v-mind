"use client";

import * as React from 'react';

import { DashboardDisconnectedState } from '@/components/dashboard/dashboard-disconnected-state';
import { DashboardEmptyState } from '@/components/dashboard/dashboard-empty-state';
import { DashboardErrorState } from '@/components/dashboard/dashboard-error-state';
import { DashboardSectionHeader } from '@/components/dashboard/dashboard-section-header';
import { DashboardSkeletonState } from '@/components/dashboard/dashboard-skeleton-state';
import { PortfolioSummaryCard } from '@/components/dashboard/portfolio-summary-card';
import { VaultList } from '@/components/dashboard/vault-list';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/hooks/use-wallet';
import { buildPortfolioSummary } from '@/lib/dashboard-api';
import { useDashboardVaultsQuery } from '@/hooks/use-dashboard-vaults-query';

export default function DashboardPage(): JSX.Element {
  const { address } = useWallet();

  const dashboardQuery = useDashboardVaultsQuery(address);

  if (!address) {
    return <DashboardDisconnectedState />;
  }

  if (dashboardQuery.isPending) {
    return <DashboardSkeletonState />;
  }

  if (dashboardQuery.isError) {
    return (
      <DashboardErrorState
        message={dashboardQuery.error instanceof Error ? dashboardQuery.error.message : 'Unable to load dashboard data.'}
        onRetry={() => {
          void dashboardQuery.refetch();
        }}
      />
    );
  }

  const vaults = dashboardQuery.data?.vaults ?? [];

  if (vaults.length === 0) {
    return <DashboardEmptyState />;
  }

  const summary = buildPortfolioSummary(vaults);

  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card/50 p-4 sm:flex-row sm:items-end sm:justify-between">
        <DashboardSectionHeader
          eyebrow="Wallet Dashboard"
          title="Portfolio performance and active vaults"
          subtitle={`Connected owner: ${address}`}
        />

        <Button
          variant="outline"
          className="sm:self-auto"
          onClick={() => {
            void dashboardQuery.refetch();
          }}
        >
          Refresh data
        </Button>
      </section>

      <PortfolioSummaryCard summary={summary} />
      <VaultList vaults={vaults} />
    </div>
  );
}
