"use client";

import { Wallet } from 'lucide-react';

export function DashboardDisconnectedState(): JSX.Element {
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
