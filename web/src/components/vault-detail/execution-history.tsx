'use client';

import { ArrowDownUp, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import * as React from 'react';

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
import { fetchVaultExecutionRecords } from '@/lib/vault-detail-api';
import { formatBlockHeight, formatMicrostx } from '@/lib/vault-detail-formatters';

import type { VaultExecutionRecord } from '@/types/vault-detail';

type SortKey = 'executionBlock' | 'executionType' | 'assetsRoutedMicrostx' | 'yieldGeneratedMicrostx' | 'feesPaidMicrostx';

interface ExecutionHistoryProps {
  vaultId: bigint;
}

function compareExecution(left: VaultExecutionRecord, right: VaultExecutionRecord, sortKey: SortKey): number {
  if (sortKey === 'executionType') {
    return left.executionType.localeCompare(right.executionType);
  }

  return Number(left[sortKey] - right[sortKey]);
}

export function ExecutionHistory({ vaultId }: ExecutionHistoryProps): JSX.Element {
  const [executions, setExecutions] = React.useState<VaultExecutionRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [sortKey, setSortKey] = React.useState<SortKey>('executionBlock');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc');
  const [page, setPage] = React.useState(0);
  const pageSize = 5;

  React.useEffect(() => {
    let alive = true;

    setLoading(true);
    setError(null);

    void fetchVaultExecutionRecords(vaultId)
      .then((records) => {
        if (alive) {
          setExecutions(records);
        }
      })
      .catch((fetchError) => {
        if (alive) {
          setError(fetchError instanceof Error ? fetchError.message : 'Unable to load execution history.');
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
  }, [vaultId]);

  React.useEffect(() => {
    setPage(0);
  }, [sortDirection, sortKey]);

  const sortedExecutions = React.useMemo(() => {
    return [...executions].sort((left, right) => {
      const comparison = compareExecution(left, right, sortKey);
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [executions, sortDirection, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sortedExecutions.length / pageSize));
  const visibleExecutions = sortedExecutions.slice(page * pageSize, page * pageSize + pageSize);

  if (loading) {
    return (
      <Card className="border-border/70 bg-card/70">
        <CardHeader>
          <CardDescription>Execution history</CardDescription>
          <CardTitle>Past strategy executions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 animate-pulse rounded-2xl border border-border/70 bg-muted/30" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-border/70 bg-card/70">
        <CardHeader>
          <CardDescription>Execution history</CardDescription>
          <CardTitle>Past strategy executions</CardTitle>
        </CardHeader>
        <CardContent>
          <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
            <p className="font-medium text-foreground">Unable to load execution history</p>
            <p className="mt-1 text-muted-foreground">{error}</p>
            <Button
              variant="outline"
              className="mt-3"
              onClick={() => {
                setError(null);
                setLoading(true);
                void fetchVaultExecutionRecords(vaultId)
                  .then(setExecutions)
                  .catch((fetchError) => {
                    setError(fetchError instanceof Error ? fetchError.message : 'Unable to load execution history.');
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

  if (executions.length === 0) {
    return (
      <Card className="border-border/70 bg-card/70">
        <CardHeader>
          <CardDescription>Execution history</CardDescription>
          <CardTitle>Past strategy executions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
            No strategy executions have been recorded for this vault yet.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/70 bg-card/70">
      <CardHeader className="gap-2">
        <CardDescription>Execution history</CardDescription>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <CardTitle className="font-[var(--font-display)] text-xl">Past strategy executions</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Showing {visibleExecutions.length} of {sortedExecutions.length} executions</p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-background/55 p-1 text-xs text-muted-foreground">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={() => setPage((current) => Math.max(0, current - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Prev
            </Button>
            <span className="px-2">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
              disabled={page >= totalPages - 1}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="overflow-hidden rounded-2xl border border-border/70 bg-background/55 p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button
                  variant="ghost"
                  size="xs"
                  className="-ml-2 h-7 px-2"
                  onClick={() => {
                    if (sortKey === 'executionBlock') {
                      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
                      return;
                    }

                    setSortKey('executionBlock');
                    setSortDirection('desc');
                  }}
                >
                  Execution block
                  <ArrowDownUp className="h-3.5 w-3.5" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="xs"
                  className="-ml-2 h-7 px-2"
                  onClick={() => {
                    if (sortKey === 'executionType') {
                      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
                      return;
                    }

                    setSortKey('executionType');
                    setSortDirection('asc');
                  }}
                >
                  Strategy type
                  <ArrowDownUp className="h-3.5 w-3.5" />
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  size="xs"
                  className="ml-auto h-7 px-2"
                  onClick={() => {
                    if (sortKey === 'assetsRoutedMicrostx') {
                      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
                      return;
                    }

                    setSortKey('assetsRoutedMicrostx');
                    setSortDirection('desc');
                  }}
                >
                  Assets routed
                  <ArrowDownUp className="h-3.5 w-3.5" />
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  size="xs"
                  className="ml-auto h-7 px-2"
                  onClick={() => {
                    if (sortKey === 'yieldGeneratedMicrostx') {
                      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
                      return;
                    }

                    setSortKey('yieldGeneratedMicrostx');
                    setSortDirection('desc');
                  }}
                >
                  Yield generated
                  <ArrowDownUp className="h-3.5 w-3.5" />
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  size="xs"
                  className="ml-auto h-7 px-2"
                  onClick={() => {
                    if (sortKey === 'feesPaidMicrostx') {
                      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
                      return;
                    }

                    setSortKey('feesPaidMicrostx');
                    setSortDirection('desc');
                  }}
                >
                  Fees paid
                  <ArrowDownUp className="h-3.5 w-3.5" />
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleExecutions.map((execution) => (
              <TableRow key={execution.txId}>
                <TableCell className="font-medium text-foreground">{formatBlockHeight(execution.executionBlock)}</TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-foreground">{execution.executionType}</p>
                    <p className="text-xs text-muted-foreground">{execution.strategyLabel}</p>
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">{formatMicrostx(execution.assetsRoutedMicrostx)}</TableCell>
                <TableCell className="text-right font-medium text-emerald-300">{formatMicrostx(execution.yieldGeneratedMicrostx)}</TableCell>
                <TableCell className="text-right font-medium">{formatMicrostx(execution.feesPaidMicrostx)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
