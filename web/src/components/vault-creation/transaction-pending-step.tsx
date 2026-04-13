"use client";

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import type { VaultCreationError } from '@/types/vault-creation';

interface TransactionPendingStepProps {
  txId: string | null;
  explorerTxUrl: string | null;
  polling: boolean;
  error: VaultCreationError | null;
  onRetryPolling: () => void;
  onBackToReview: () => void;
}

export function TransactionPendingStep(props: TransactionPendingStepProps): JSX.Element {
  const { txId, explorerTxUrl, polling, error, onRetryPolling, onBackToReview } = props;

  return (
    <section className="space-y-4" aria-labelledby="pending-title">
      <div className="space-y-1">
        <h2 id="pending-title" className="font-[var(--font-display)] text-2xl font-semibold tracking-tight">
          Transaction pending
        </h2>
        <p className="text-sm text-muted-foreground">
          Confirm this transaction in your wallet and wait for on-chain confirmation before moving funds.
        </p>
      </div>

      <div className="rounded-xl border border-border/70 bg-card/50 p-4">
        <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Transaction status</p>
        <p className="mt-1 text-sm text-foreground">
          {polling ? 'Waiting for confirmation on Stacks network.' : 'Waiting for wallet signature or polling update.'}
        </p>

        <p className="mt-4 text-xs uppercase tracking-[0.15em] text-muted-foreground">Transaction ID</p>
        <p className="mt-1 break-all rounded-md border border-border/70 bg-background/50 px-2 py-1 text-xs text-foreground">
          {txId ?? 'Transaction ID will appear once your wallet submits the contract call.'}
        </p>

        {explorerTxUrl ? (
          <div className="mt-3">
            <Button variant="outline" render={<Link href={explorerTxUrl} target="_blank" rel="noreferrer" />}>
              View on Stacks Explorer
            </Button>
          </div>
        ) : null}
      </div>

      {error ? (
        <div role="alert" className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm">
          <p className="font-semibold text-foreground">{error.title}</p>
          <p className="mt-1 text-muted-foreground">{error.message}</p>
          {error.details ? <p className="mt-2 text-xs text-muted-foreground">Details: {error.details}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {txId ? (
              <Button variant="outline" onClick={onRetryPolling}>
                Retry status check
              </Button>
            ) : null}
            <Button variant="outline" onClick={onBackToReview}>
              Back to review
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
