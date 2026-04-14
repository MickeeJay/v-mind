'use client';

import * as React from 'react';
import { ArrowDownUp, ChevronDown, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { fetchVaultAllocation } from '@/lib/vault-detail-api';
import { formatBasisPoints, formatMicrostx } from '@/lib/vault-detail-formatters';
import type { VaultAllocationEntry } from '@/types/vault-detail';

type SortKey = 'allocationBps' | 'amountMicrostx' | 'protocolLabel';

interface AllocationBreakdownProps {
  vaultId: bigint;
}

function compareAllocation(left: VaultAllocationEntry, right: VaultAllocationEntry, sortKey: SortKey): number {
  if (sortKey === 'protocolLabel') {
    return left.protocolLabel.localeCompare(right.protocolLabel);
  }

  if (sortKey === 'amountMicrostx') {
    return Number(left.amountMicrostx - right.amountMicrostx);
  }

  return Number(left.allocationBps - right.allocationBps);
}

function sortDirectionSymbol(direction: 'asc' | 'desc'): JSX.Element {
  return <ChevronDown className={`h-3.5 w-3.5 transition-transform ${direction === 'asc' ? 'rotate-180' : ''}`} />;
}

export function AllocationBreakdown({ vaultId }: AllocationBreakdownProps): JSX.Element {
  const [allocation, setAllocation] = React.useState<VaultAllocationEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [sortKey, setSortKey] = React.useState<SortKey>('allocationBps');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc');

  React.useEffect(() => {
    let alive = true;

    setLoading(true);
    setError(null);

    void fetchVaultAllocation(vaultId)
      .then((entries) => {
        if (!alive) {
          return;
        }

        setAllocation(entries);
      })
      .catch((fetchError) => {
        if (!alive) {
          return;
        }

        setError(fetchError instanceof Error ? fetchError.message : 'Unable to load vault allocation.');
      })
      .finally(() => {
        if (alive) {
          setLoading(false);
        }
      });

    return () => {
      alive = false;
    };
  }, [vaultId]);

  const sortedAllocation = React.useMemo(() => {
    return [...allocation].sort((left, right) => {
      const value = compareAllocation(left, right, sortKey);
      return sortDirection === 'asc' ? value : -value;
    });
  }, [allocation, sortDirection, sortKey]);

  const totalAllocated = allocation.reduce((sum, entry) => sum + entry.amountMicrostx, 0n);

  const chartStops = allocation
    .map((entry, index) => {
      const start = allocation.slice(0, index).reduce((sum, current) => sum + current.allocationBps, 0n);
      const end = start + entry.allocationBps;
      return `${entry.color} ${start / 100n}% ${end / 100n}%`;
    })
    .join(', ');

  if (loading) {
    return (
      <Card className="border-border/70 bg-card/70">
        <CardHeader>
          <CardDescription>Allocation breakdown</CardDescription>
          <CardTitle>Current vault composition</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-56 animate-pulse rounded-2xl border border-border/70 bg-muted/30" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-border/70 bg-card/70">
        <CardHeader>
          <CardDescription>Allocation breakdown</CardDescription>
          <CardTitle>Current vault composition</CardTitle>
        </CardHeader>
        <CardContent>
          <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
            <p className="font-medium text-foreground">Unable to load allocation data</p>
            <p className="mt-1 text-muted-foreground">{error}</p>
            <Button
              variant="outline"
              className="mt-3"
              onClick={() => {
                setError(null);
                setLoading(true);
                void fetchVaultAllocation(vaultId)
                  .then(setAllocation)
                  .catch((fetchError) => {
                    setError(fetchError instanceof Error ? fetchError.message : 'Unable to load vault allocation.');
                  })
                  .finally(() => setLoading(false));
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (allocation.length === 0) {
    return (
      <Card className="border-border/70 bg-card/70">
        <CardHeader>
          <CardDescription>Allocation breakdown</CardDescription>
          <CardTitle>Current vault composition</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
            This vault has not been deployed into any protocol positions yet.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/70 bg-card/70">
      <CardHeader className="gap-2">
        <CardDescription>Allocation breakdown</CardDescription>
        <CardTitle className="font-[var(--font-display)] text-xl">Current vault composition</CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
            <div className="relative mx-auto flex h-52 w-52 items-center justify-center">
              <div
                className="absolute inset-0 rounded-full"
                style={{ background: `conic-gradient(${chartStops || 'rgb(148 163 184) 0% 100%'})` }}
                aria-hidden="true"
              />
              <div className="absolute inset-[18%] rounded-full border border-border/70 bg-card/95" aria-hidden="true" />
              <div className="relative text-center">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Total allocated</p>
                <p className="mt-1 font-[var(--font-display)] text-2xl font-semibold">{formatMicrostx(totalAllocated)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Across {allocation.length} protocol legs</p>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border/70 bg-background/55">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="xs"
                      className="-ml-2 h-7 px-2"
                      onClick={() => {
                        if (sortKey === 'protocolLabel') {
                          setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
                          return;
                        }

                        setSortKey('protocolLabel');
                        setSortDirection('asc');
                      }}
                    >
                      Protocol
                      {sortKey === 'protocolLabel' ? sortDirectionSymbol(sortDirection) : <ArrowDownUp className="h-3.5 w-3.5" />}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      size="xs"
                      className="ml-auto h-7 px-2"
                      onClick={() => {
                        if (sortKey === 'allocationBps') {
                          setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
                          return;
                        }

                        setSortKey('allocationBps');
                        setSortDirection('desc');
                      }}
                    >
                      Allocation
                      {sortKey === 'allocationBps' ? sortDirectionSymbol(sortDirection) : <ArrowDownUp className="h-3.5 w-3.5" />}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      size="xs"
                      className="ml-auto h-7 px-2"
                      onClick={() => {
                        if (sortKey === 'amountMicrostx') {
                          setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
                          return;
                        }

                        setSortKey('amountMicrostx');
                        setSortDirection('desc');
                      }}
                    >
                      Amount
                      {sortKey === 'amountMicrostx' ? sortDirectionSymbol(sortDirection) : <ArrowDownUp className="h-3.5 w-3.5" />}
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAllocation.map((entry) => (
                  <TableRow key={entry.protocolId.toString()}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} aria-hidden="true" />
                        <div>
                          <p className="font-medium text-foreground">{entry.protocolLabel}</p>
                          <p className="text-xs text-muted-foreground">{entry.protocolSymbol}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatBasisPoints(entry.allocationBps)}</TableCell>
                    <TableCell className="text-right font-medium">{formatMicrostx(entry.amountMicrostx)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
