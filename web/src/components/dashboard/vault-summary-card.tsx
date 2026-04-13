"use client";

import { ArrowDownToLine, ArrowUpToLine, EllipsisVertical, Eye } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { DashboardVault, VaultStatus } from '@/types/dashboard';

interface VaultSummaryCardProps {
  vault: DashboardVault;
}

const STATUS_STYLES: Record<VaultStatus, string> = {
  active: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  paused: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  cooldown: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  archived: 'border-muted bg-muted/40 text-muted-foreground',
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value > 1000 ? 0 : 2,
  }).format(value);
}

function formatLastExecution(value: string | null): string {
  if (!value) {
    return 'Not executed yet';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unavailable';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function VaultSummaryCard({ vault }: VaultSummaryCardProps): JSX.Element {
  return (
    <Card className="border-border/70 bg-card/70">
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base sm:text-lg">{vault.name}</CardTitle>
            <p className="mt-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">{vault.strategyName}</p>
          </div>

          <div className="flex items-center gap-2">
            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${STATUS_STYLES[vault.status]}`}>
              {vault.status}
            </span>

            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                <EllipsisVertical className="h-4 w-4" />
                <span className="sr-only">Vault actions</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel>Quick actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <ArrowDownToLine className="mr-2 h-4 w-4" />
                  Deposit
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <ArrowUpToLine className="mr-2 h-4 w-4" />
                  Withdraw
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Eye className="mr-2 h-4 w-4" />
                  View details
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Current balance</p>
          <p className="mt-1 font-semibold">{vault.balanceBtc.toFixed(6)} BTC</p>
          <p className="text-xs text-muted-foreground">{formatCurrency(vault.balanceUsd)}</p>
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Estimated APY</p>
          <p className="mt-1 font-semibold text-bitcoin-300">{vault.estimatedApy.toFixed(2)}%</p>
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Yield earned</p>
          <p className="mt-1 font-semibold">{vault.yieldEarnedBtc.toFixed(6)} BTC</p>
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Last execution</p>
          <p className="mt-1 font-semibold">{formatLastExecution(vault.lastExecutionAt)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
