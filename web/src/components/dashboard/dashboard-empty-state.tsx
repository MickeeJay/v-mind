"use client";

import { PlusCircle, Sparkles } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

export function DashboardEmptyState(): JSX.Element {
  return (
    <section className="rounded-2xl border border-border/70 bg-gradient-to-br from-card via-card/70 to-bitcoin-500/10 p-6 text-center sm:p-8">
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4">
        <div className="relative flex h-28 w-28 items-center justify-center rounded-full border border-bitcoin-500/40 bg-bitcoin-500/10">
          <span className="absolute -right-1 -top-1 rounded-full border border-bitcoin-500/50 bg-bitcoin-500/20 p-2">
            <Sparkles className="h-4 w-4 text-bitcoin-300" />
          </span>
          <div className="grid h-16 w-16 grid-cols-2 gap-2">
            <div className="rounded-md bg-bitcoin-500/30" />
            <div className="rounded-md bg-bitcoin-500/20" />
            <div className="rounded-md bg-bitcoin-500/20" />
            <div className="rounded-md bg-bitcoin-500/30" />
          </div>
        </div>

        <h2 className="font-[var(--font-display)] text-2xl font-semibold tracking-tight">No vaults found for this wallet</h2>
        <p className="max-w-lg text-sm text-muted-foreground sm:text-base">
          V-Mind automates Bitcoin-native strategy vaults on Stacks. Create your first vault to start allocating
          capital, earning yield, and monitoring on-chain performance in one place.
        </p>

        <div className="w-full max-w-lg rounded-xl border border-border/70 bg-card/60 p-3 text-left text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">How it works</p>
          <ol className="mt-2 space-y-1.5">
            <li>1. Create a vault and choose a strategy profile.</li>
            <li>2. Deposit BTC-backed capital into the vault.</li>
            <li>3. Track yield, APY, and execution health from this dashboard.</li>
          </ol>
        </div>

        <Button render={<Link href="/vaults" />} className="bg-bitcoin-500 text-bitcoin-950 hover:bg-bitcoin-400">
          <PlusCircle className="mr-2 h-4 w-4" />
          Create your first vault
        </Button>
      </div>
    </section>
  );
}
