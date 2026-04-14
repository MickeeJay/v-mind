'use client';

import Link from 'next/link';
import * as React from 'react';
import { Activity, Clock3, ExternalLink, RefreshCw, ShieldAlert, ShieldCheck, Wallet } from 'lucide-react';

import { ProtocolStatusBadge } from '@/components/protocols/protocol-status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ProtocolHealthPageData, ProtocolHealthSnapshot } from '@/types/protocol-health';

interface SerializedProtocolHealthSnapshot extends Omit<ProtocolHealthSnapshot, 'tvlMicrostx'> {
  tvlMicrostx: string;
}

interface SerializedProtocolHealthPageData {
  checkedAt: string;
  agentStatus: ProtocolHealthPageData['agentStatus'];
  protocols: SerializedProtocolHealthSnapshot[];
}

interface ProtocolHealthDashboardProps {
  initialData: ProtocolHealthPageData;
}

const REFRESH_INTERVAL_SECONDS = 60;

function formatMicrostx(value: bigint): string {
  const scale = 1_000_000n;
  const whole = value / scale;
  const fraction = value % scale;
  const fractionText = fraction.toString().padStart(6, '0').replace(/0+$/, '');
  return fractionText ? `${whole.toString()}.${fractionText}` : whole.toString();
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return 'Unavailable';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function deserializeProtocolHealthData(data: SerializedProtocolHealthPageData): ProtocolHealthPageData {
  return {
    checkedAt: data.checkedAt,
    agentStatus: data.agentStatus,
    protocols: data.protocols.map((protocol) => ({
      ...protocol,
      tvlMicrostx: BigInt(protocol.tvlMicrostx),
    })),
  };
}

function agentStatusLabel(status: ProtocolHealthPageData['agentStatus']): string {
  if (status === 'running') {
    return 'Agent is running';
  }

  if (status === 'degraded') {
    return 'Agent is degraded';
  }

  if (status === 'stopped') {
    return 'Agent is stopped';
  }

  return 'Agent status unavailable';
}

function agentStatusTone(status: ProtocolHealthPageData['agentStatus']): 'operational' | 'degraded' | 'unavailable' {
  if (status === 'running') {
    return 'operational';
  }

  if (status === 'degraded' || status === 'starting') {
    return 'degraded';
  }

  return 'unavailable';
}

async function fetchProtocolHealthData(): Promise<ProtocolHealthPageData> {
  const response = await fetch('/api/protocol-health', {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? 'Unable to load protocol health data.');
  }

  return deserializeProtocolHealthData((await response.json()) as SerializedProtocolHealthPageData);
}

export function ProtocolHealthDashboard({ initialData }: ProtocolHealthDashboardProps): JSX.Element {
  const [data, setData] = React.useState(initialData);
  const [refreshing, setRefreshing] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = React.useState(REFRESH_INTERVAL_SECONDS);

  const refresh = React.useCallback(async () => {
    setRefreshing(true);
    setErrorMessage(null);

    try {
      const nextData = await fetchProtocolHealthData();
      setData(nextData);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to refresh protocol health data.');
    } finally {
      setRefreshing(false);
      setSecondsRemaining(REFRESH_INTERVAL_SECONDS);
    }
  }, []);

  React.useEffect(() => {
    const intervalId = window.setInterval(() => {
      setSecondsRemaining((current) => (current > 0 ? current - 1 : 0));
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  React.useEffect(() => {
    if (secondsRemaining === 0 && !refreshing) {
      void refresh();
    }
  }, [refresh, refreshing, secondsRemaining]);

  const monitoredCount = data.protocols.length;
  const operationalCount = data.protocols.filter((protocol) => protocol.status === 'operational').length;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card/60 p-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Protocol health</p>
          <h1 className="mt-1 font-[var(--font-display)] text-3xl font-semibold tracking-tight">Monitor live protocol readiness</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Watch adapter health, protocol exposure, and live rate snapshots before creating or rebalancing a vault.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-xl border border-border/70 bg-background/60 px-3 py-2 text-sm">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Auto refresh</p>
            <p className="mt-1 font-medium text-foreground" aria-live="polite">
              {refreshing ? 'Refreshing now' : `${secondsRemaining}s remaining`}
            </p>
          </div>

          <Button variant="outline" onClick={() => void refresh()} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh now
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/70 bg-card/70">
          <CardHeader>
            <CardDescription>Agent runtime</CardDescription>
            <CardTitle className="flex items-center gap-2 font-[var(--font-display)] text-2xl">
              <span className="rounded-full border border-border/70 bg-background/60 p-2 text-bitcoin-400">
                {data.agentStatus === 'running' ? <ShieldCheck className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
              </span>
              {agentStatusLabel(data.agentStatus)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-bitcoin-400" />
              {operationalCount} of {monitoredCount} protocols currently operational
            </p>
            <p className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-bitcoin-400" />
              Last checked {formatTimestamp(data.checkedAt)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/70">
          <CardHeader>
            <CardDescription>Monitored protocols</CardDescription>
            <CardTitle className="font-[var(--font-display)] text-2xl">{monitoredCount}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Aggregated from on-chain vault positions, adapter rates, and the agent runtime health endpoint.</p>
            <p>Manual refresh is available if you want to re-check the latest protocol state before a deployment.</p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/70">
          <CardHeader>
            <CardDescription>Health status</CardDescription>
            <CardTitle className="font-[var(--font-display)] text-2xl">{data.agentStatus === 'running' ? 'Ready' : 'Needs attention'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>{agentStatusTone(data.agentStatus) === 'operational' ? 'Operational systems are up and responding.' : 'One or more health signals need attention.'}</p>
            <p>Refresh cadence: every 60 seconds.</p>
          </CardContent>
        </Card>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200" role="alert">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {data.protocols.map((protocol) => (
          <Card key={protocol.id} className="border-border/70 bg-card/70">
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardDescription>{protocol.contractPrincipal}</CardDescription>
                  <CardTitle className="font-[var(--font-display)] text-2xl">{protocol.name}</CardTitle>
                </div>
                <ProtocolStatusBadge status={protocol.status} />
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                <span className="rounded-full border border-border/70 bg-background/60 px-2 py-1">{protocol.rateLabel}</span>
                <span className="rounded-full border border-border/70 bg-background/60 px-2 py-1">Updated {formatTimestamp(protocol.lastUpdatedAt)}</span>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border/70 bg-background/50 p-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">TVL</p>
                  <p className="mt-1 font-semibold text-foreground">{formatMicrostx(protocol.tvlMicrostx)} microSTX</p>
                </div>

                <div className="rounded-xl border border-border/70 bg-background/50 p-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Rate</p>
                  <p className="mt-1 font-semibold text-foreground">{protocol.rateValue}</p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                This protocol is read against its live adapter contract and the aggregated position set held by vault execution.
              </p>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button variant="outline" render={<Link href={protocol.explorerUrl} target="_blank" rel="noreferrer" />}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View on Explorer
                </Button>

                <div className="flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-3 py-1 text-xs text-muted-foreground">
                  <Wallet className="h-3.5 w-3.5 text-bitcoin-400" />
                  {protocol.status === 'operational' ? 'Ready for vault creation' : 'Review before deploying'}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
