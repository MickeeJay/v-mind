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
import { buildPortfolioSummary, fetchDashboardVaults } from '@/lib/dashboard-api';
import type { DashboardVault } from '@/types/dashboard';

type PageState = 'idle' | 'loading' | 'ready' | 'error';

export default function DashboardPage(): JSX.Element {
  const { address } = useWallet();

  const [pageState, setPageState] = React.useState<PageState>('idle');
  const [vaults, setVaults] = React.useState<DashboardVault[]>([]);
  const [errorMessage, setErrorMessage] = React.useState<string>('');
  const [retryKey, setRetryKey] = React.useState(0);

  React.useEffect(() => {
    if (!address) {
      setPageState('idle');
      setVaults([]);
      setErrorMessage('');
      return;
    }

    const controller = new AbortController();
    setPageState('loading');
    setErrorMessage('');

    void fetchDashboardVaults(address, { signal: controller.signal })
      .then((response) => {
        setVaults(response.vaults);
        setPageState('ready');
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }

        setPageState('error');
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load dashboard data.');
      });

    return () => {
      controller.abort();
    };
  }, [address, retryKey]);

  if (!address) {
    return <DashboardDisconnectedState />;
  }

  if (pageState === 'loading') {
    return <DashboardSkeletonState />;
  }

  if (pageState === 'error') {
    return (
      <DashboardErrorState
        message={errorMessage}
        onRetry={() => {
          setRetryKey((value) => value + 1);
        }}
      />
    );
  }

  if (pageState === 'ready' && vaults.length === 0) {
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
            setRetryKey((value) => value + 1);
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
