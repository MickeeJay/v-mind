"use client";

import * as React from 'react';
import { Wallet } from 'lucide-react';

import { DashboardEmptyState } from '@/components/dashboard/dashboard-empty-state';
import { DashboardErrorState } from '@/components/dashboard/dashboard-error-state';
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
    return (
      <section className="rounded-2xl border border-border/70 bg-card/70 p-6 sm:p-8">
        <div className="mx-auto max-w-xl text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-border/70 bg-muted/60">
            <Wallet className="h-6 w-6 text-bitcoin-300" />
          </div>
          <h1 className="font-[var(--font-display)] text-2xl font-semibold tracking-tight">Connect your wallet to view your dashboard</h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Your portfolio and vault analytics appear here after you connect a Stacks wallet from the top navigation.
          </p>
        </div>
      </section>
    );
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
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-bitcoin-300">Wallet Dashboard</p>
          <h1 className="mt-1 font-[var(--font-display)] text-2xl font-semibold tracking-tight sm:text-3xl">Portfolio performance and active vaults</h1>
          <p className="mt-1 break-all text-xs text-muted-foreground sm:text-sm">Connected owner: {address}</p>
        </div>

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
