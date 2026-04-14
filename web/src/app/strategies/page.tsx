'use client';

import { Filter, RefreshCw, Search } from 'lucide-react';
import * as React from 'react';

import { StrategyBrowserControls } from '@/components/strategies/strategy-browser-controls';
import { StrategyCard } from '@/components/strategies/strategy-card';
import { StrategyDetailDialog } from '@/components/strategies/strategy-detail-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useStrategyBrowserQuery } from '@/hooks/use-strategy-browser-query';

import type {
  StrategyBrowserStrategy,
  StrategyFilterRisk,
  StrategyFilterType,
  StrategySortKey,
} from '@/types/strategy-browser';

function matchesStrategyType(strategy: StrategyBrowserStrategy, filter: StrategyFilterType): boolean {
  if (filter === 'all') {
    return true;
  }

  if (filter === 'yield') {
    return strategy.strategyType === 1n;
  }

  if (filter === 'rebalance') {
    return strategy.strategyType === 2n;
  }

  if (filter === 'dca') {
    return strategy.strategyType === 3n;
  }

  if (filter === 'exit') {
    return strategy.strategyType === 4n;
  }

  return true;
}

function matchesRisk(strategy: StrategyBrowserStrategy, filter: StrategyFilterRisk): boolean {
  if (filter === 'all') {
    return true;
  }

  return strategy.riskLabel.toLowerCase() === filter;
}

function compareStrategies(left: StrategyBrowserStrategy, right: StrategyBrowserStrategy, sortKey: StrategySortKey): number {
  if (sortKey === 'name') {
    return left.name.localeCompare(right.name);
  }

  const leftApy = Number.parseFloat(left.estimatedApyRange.split('-').at(-1)?.replace(/[^\d.]/g, '') ?? '0');
  const rightApy = Number.parseFloat(right.estimatedApyRange.split('-').at(-1)?.replace(/[^\d.]/g, '') ?? '0');

  return leftApy - rightApy;
}

export default function StrategiesPage(): JSX.Element {
  const [typeFilter, setTypeFilter] = React.useState<StrategyFilterType>('all');
  const [riskFilter, setRiskFilter] = React.useState<StrategyFilterRisk>('all');
  const [assetFilter, setAssetFilter] = React.useState('all');
  const [sortKey, setSortKey] = React.useState<StrategySortKey>('apy');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc');
  const [activeStrategy, setActiveStrategy] = React.useState<StrategyBrowserStrategy | null>(null);
  const strategiesQuery = useStrategyBrowserQuery();
  const strategies = strategiesQuery.data ?? [];

  const assetOptions = React.useMemo(() => {
    return Array.from(new Set(strategies.map((strategy) => strategy.targetAssetSymbol))).sort((left, right) => left.localeCompare(right));
  }, [strategies]);

  const filteredStrategies = React.useMemo(() => {
    return strategies
      .filter((strategy) => matchesStrategyType(strategy, typeFilter))
      .filter((strategy) => matchesRisk(strategy, riskFilter))
      .filter((strategy) => (assetFilter === 'all' ? true : strategy.targetAssetSymbol === assetFilter))
      .sort((left, right) => {
        const comparison = compareStrategies(left, right, sortKey);
        return sortDirection === 'asc' ? comparison : -comparison;
      });
  }, [assetFilter, riskFilter, sortDirection, sortKey, strategies, typeFilter]);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/60 p-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Strategy browser</p>
          <h1 className="mt-1 font-[var(--font-display)] text-3xl font-semibold tracking-tight">Explore registered strategies</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Review the on-chain strategy registry, compare risk profiles, and jump straight into vault creation once you find a fit.
          </p>
        </div>

        <Button variant="outline" onClick={() => void strategiesQuery.refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <StrategyBrowserControls
        typeFilter={typeFilter}
        riskFilter={riskFilter}
        assetFilter={assetFilter}
        sortKey={sortKey}
        sortDirection={sortDirection}
        assetOptions={assetOptions}
        onTypeFilterChange={setTypeFilter}
        onRiskFilterChange={setRiskFilter}
        onAssetFilterChange={setAssetFilter}
        onSortKeyChange={setSortKey}
        onSortDirectionToggle={() => setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))}
        onClearFilters={() => {
          setTypeFilter('all');
          setRiskFilter('all');
          setAssetFilter('all');
          setSortKey('apy');
          setSortDirection('desc');
        }}
      />

      {strategiesQuery.isPending ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-72 animate-pulse rounded-2xl border border-border/70 bg-card/50" />
          ))}
        </div>
      ) : strategiesQuery.isError ? (
        <Card className="border-border/70 bg-card/70">
          <CardHeader>
            <CardDescription>Strategy registry</CardDescription>
            <CardTitle className="font-[var(--font-display)] text-2xl">Unable to load strategies</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {strategiesQuery.error instanceof Error ? strategiesQuery.error.message : 'Unable to load strategies.'}
            </p>
            <Button className="mt-4" onClick={() => void strategiesQuery.refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : filteredStrategies.length === 0 ? (
        <Card className="border-border/70 bg-card/70">
          <CardHeader>
            <CardDescription>Strategy registry</CardDescription>
            <CardTitle className="font-[var(--font-display)] text-2xl">No strategies match your filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
              <Search className="mr-2 inline-block h-4 w-4 text-bitcoin-400" />
              Try resetting the filters or broaden the selected asset and risk tier.
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4 text-bitcoin-400" />
            Showing {filteredStrategies.length} of {strategies.length} strategies
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredStrategies.map((strategy) => (
              <StrategyCard
                key={strategy.id.toString()}
                strategy={strategy}
                onViewDetails={(nextStrategy) => {
                  setActiveStrategy(nextStrategy);
                }}
              />
            ))}
          </div>
        </>
      )}

      <StrategyDetailDialog
        strategy={activeStrategy}
        open={activeStrategy !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setActiveStrategy(null);
          }
        }}
      />
    </section>
  );
}
