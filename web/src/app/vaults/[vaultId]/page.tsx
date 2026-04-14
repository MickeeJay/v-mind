'use client';

import Link from 'next/link';
import * as React from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';

import { AllocationBreakdown } from '@/components/vault-detail/allocation-breakdown';
import { ExecutionHistory } from '@/components/vault-detail/execution-history';
import { PerformanceChart } from '@/components/vault-detail/performance-chart';
import { VaultActions } from '@/components/vault-detail/vault-actions';
import { VaultMetadata } from '@/components/vault-detail/vault-metadata';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchVaultOverview } from '@/lib/vault-detail-api';
import { formatMicrostx } from '@/lib/vault-detail-formatters';
import type { VaultDetailSnapshot } from '@/types/vault-detail';

interface VaultDetailsPageProps {
  params: {
    vaultId: string;
  };
}

function renderHero(snapshot: VaultDetailSnapshot): JSX.Element {
  return (
    <Card className="border-border/70 bg-card/70">
      <CardHeader className="gap-2">
        <CardDescription>Vault detail page</CardDescription>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="font-[var(--font-display)] text-2xl sm:text-3xl">Vault #{snapshot.vaultId.toString()}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {snapshot.strategy.name} manages {snapshot.assetPrincipal} through the {snapshot.strategy.strategyTypeLabel} strategy.
            </p>
          </div>
          <span className="inline-flex rounded-full border border-border/70 bg-background/60 px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {snapshot.status}
          </span>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-xl border border-border/70 bg-background/55 p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Current balance</p>
            <p className="mt-1 text-lg font-semibold">{formatMicrostx(snapshot.totalAssetsMicrostx)}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/55 p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Shares outstanding</p>
            <p className="mt-1 text-lg font-semibold">{formatMicrostx(snapshot.sharesOutstanding)} shares</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/55 p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Owner balance</p>
            <p className="mt-1 text-lg font-semibold">{formatMicrostx(snapshot.ownerShareBalance)} shares</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/55 p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Share price</p>
            <p className="mt-1 text-lg font-semibold">{formatMicrostx(snapshot.sharePriceScaled)} per share</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/55 p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Cumulative fees</p>
            <p className="mt-1 text-lg font-semibold">{formatMicrostx(snapshot.cumulativeFeesPaidMicrostx)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function VaultDetailsPage({ params }: VaultDetailsPageProps): JSX.Element {
  const vaultId = React.useMemo(() => {
    try {
      return BigInt(params.vaultId);
    } catch {
      return null;
    }
  }, [params.vaultId]);

  const [snapshot, setSnapshot] = React.useState<VaultDetailSnapshot | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [retryKey, setRetryKey] = React.useState(0);

  React.useEffect(() => {
    if (!vaultId) {
      setSnapshot(null);
      setError('Vault ID is invalid.');
      setLoading(false);
      return;
    }

    let alive = true;

    setLoading(true);
    setError(null);

    void fetchVaultOverview(vaultId)
      .then((data) => {
        if (alive) {
          setSnapshot(data);
        }
      })
      .catch((fetchError) => {
        if (alive) {
          setError(fetchError instanceof Error ? fetchError.message : 'Unable to load vault details.');
          setSnapshot(null);
        }
      })
      .finally(() => {
        if (alive) {
          setLoading(false);
        }
      });

    return () => {
      alive = false;
    };
  }, [retryKey, vaultId]);

  if (!vaultId) {
    return (
      <section className="space-y-4">
        <Card className="border-border/70 bg-card/70">
          <CardHeader>
            <CardDescription>Vault detail page</CardDescription>
            <CardTitle className="font-[var(--font-display)] text-2xl">Invalid vault ID</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">The requested vault identifier could not be parsed.</p>
            <Button className="mt-4" render={<Link href="/vaults" />}>
              Back to vault list
            </Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="space-y-4">
        <Card className="border-border/70 bg-card/70">
          <CardHeader>
            <CardDescription>Vault detail page</CardDescription>
            <CardTitle className="font-[var(--font-display)] text-2xl">Loading vault #{vaultId.toString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-20 animate-pulse rounded-xl border border-border/70 bg-muted/30" />
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  if (error || !snapshot) {
    return (
      <section className="space-y-4">
        <Card className="border-border/70 bg-card/70">
          <CardHeader>
            <CardDescription>Vault detail page</CardDescription>
            <CardTitle className="font-[var(--font-display)] text-2xl">Unable to load vault details</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{error ?? 'Vault snapshot is unavailable.'}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={() => setRetryKey((current) => current + 1)}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
              <Button variant="outline" render={<Link href="/vaults" />}>
                Back to vault list
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/60 p-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Vault operations center</p>
          <h1 className="mt-1 font-[var(--font-display)] text-3xl font-semibold tracking-tight">Vault #{snapshot.vaultId.toString()}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Current allocation, execution cadence, fee performance, and owner controls for this vault in one place.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" render={<Link href="/dashboard" />}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
          <Button variant="outline" onClick={() => setRetryKey((current) => current + 1)}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {renderHero(snapshot)}

      <div className="grid gap-4 lg:grid-cols-2">
        <VaultMetadata snapshot={snapshot} />
        <AllocationBreakdown vaultId={snapshot.vaultId} />
      </div>

      <PerformanceChart vaultId={snapshot.vaultId} />

      <ExecutionHistory vaultId={snapshot.vaultId} />

      <VaultActions snapshot={snapshot} />
    </section>
  );
}
