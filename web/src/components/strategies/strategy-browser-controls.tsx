'use client';

import { ArrowDownUp, FilterX } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import type { StrategyFilterRisk, StrategyFilterType, StrategySortKey } from '@/types/strategy-browser';

interface StrategyBrowserControlsProps {
  typeFilter: StrategyFilterType;
  riskFilter: StrategyFilterRisk;
  assetFilter: string;
  sortKey: StrategySortKey;
  sortDirection: 'asc' | 'desc';
  assetOptions: string[];
  onTypeFilterChange: (value: StrategyFilterType) => void;
  onRiskFilterChange: (value: StrategyFilterRisk) => void;
  onAssetFilterChange: (value: string) => void;
  onSortKeyChange: (value: StrategySortKey) => void;
  onSortDirectionToggle: () => void;
  onClearFilters: () => void;
}

export function StrategyBrowserControls(props: StrategyBrowserControlsProps): JSX.Element {
  const {
    typeFilter,
    riskFilter,
    assetFilter,
    sortKey,
    sortDirection,
    assetOptions,
    onTypeFilterChange,
    onRiskFilterChange,
    onAssetFilterChange,
    onSortKeyChange,
    onSortDirectionToggle,
    onClearFilters,
  } = props;

  return (
    <div className="grid gap-3 rounded-2xl border border-border/70 bg-card/70 p-4 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
      <Select value={typeFilter} onValueChange={(value) => onTypeFilterChange(value as StrategyFilterType)}>
        <SelectTrigger className="w-full" aria-label="Strategy type">
          <SelectValue placeholder="Strategy type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          <SelectItem value="yield">Yield</SelectItem>
          <SelectItem value="rebalance">Rebalance</SelectItem>
          <SelectItem value="dca">DCA</SelectItem>
          <SelectItem value="exit">Exit</SelectItem>
        </SelectContent>
      </Select>

      <Select value={riskFilter} onValueChange={(value) => onRiskFilterChange(value as StrategyFilterRisk)}>
        <SelectTrigger className="w-full" aria-label="Risk tier">
          <SelectValue placeholder="Risk tier" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All risk tiers</SelectItem>
          <SelectItem value="conservative">Conservative</SelectItem>
          <SelectItem value="moderate">Moderate</SelectItem>
          <SelectItem value="aggressive">Aggressive</SelectItem>
        </SelectContent>
      </Select>

      <Select value={assetFilter} onValueChange={(value) => onAssetFilterChange(value ?? 'all')}>
        <SelectTrigger className="w-full" aria-label="Target asset">
          <SelectValue placeholder="Target asset" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All assets</SelectItem>
          {assetOptions.map((asset) => (
            <SelectItem key={asset} value={asset}>
              {asset}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={sortKey} onValueChange={(value) => onSortKeyChange(value as StrategySortKey)}>
        <SelectTrigger className="w-full" aria-label="Sort strategies">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apy">APY</SelectItem>
          <SelectItem value="name">Name</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2">
        <Button variant="outline" className="w-full xl:w-auto" onClick={onSortDirectionToggle}>
          <ArrowDownUp className="mr-2 h-4 w-4" />
          {sortDirection === 'asc' ? 'Ascending' : 'Descending'}
        </Button>
        <Button variant="ghost" className="w-full xl:w-auto" onClick={onClearFilters}>
          <FilterX className="mr-2 h-4 w-4" />
          Reset
        </Button>
      </div>
    </div>
  );
}
