"use client";

import { AlertTriangle, RefreshCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface DashboardErrorStateProps {
  message?: string;
  onRetry: () => void;
}

export function DashboardErrorState({ message, onRetry }: DashboardErrorStateProps): JSX.Element {
  return (
    <section className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 sm:p-8">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-rose-500/30 bg-rose-500/20">
          <AlertTriangle className="h-6 w-6 text-rose-300" />
        </div>

        <h2 className="font-[var(--font-display)] text-2xl font-semibold tracking-tight">Unable to load your vault dashboard</h2>
        <p className="mt-2 text-sm text-rose-100/85 sm:text-base">
          {message ?? 'We could not fetch your on-chain vault data right now. Please retry in a few seconds.'}
        </p>

        <div className="mt-5 flex justify-center">
          <Button onClick={onRetry} variant="outline" className="border-rose-300/40 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20">
            <RefreshCcw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    </section>
  );
}
