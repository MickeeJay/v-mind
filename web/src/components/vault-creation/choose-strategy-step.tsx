"use client";

import * as React from 'react';

import { Button } from '@/components/ui/button';
import type { VaultStrategy } from '@/types/vault-creation';

interface ChooseStrategyStepProps {
  strategies: VaultStrategy[];
  selectedStrategyId: bigint | null;
  loading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
  onSelect: (strategyId: bigint) => void;
  onNext: () => void;
}

function riskBadgeClass(risk: VaultStrategy['riskLabel']): string {
  if (risk === 'Conservative') {
    return 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300';
  }

  if (risk === 'Aggressive') {
    return 'border-rose-500/40 bg-rose-500/15 text-rose-300';
  }

  return 'border-amber-500/40 bg-amber-500/15 text-amber-300';
}

export function ChooseStrategyStep(props: ChooseStrategyStepProps): JSX.Element {
  const { strategies, selectedStrategyId, loading, errorMessage, onRetry, onSelect, onNext } = props;

  return (
    <section className="space-y-4" aria-labelledby="choose-strategy-title">
      <div className="space-y-1">
        <h2 id="choose-strategy-title" className="font-[var(--font-display)] text-2xl font-semibold tracking-tight">
          Choose a strategy
        </h2>
        <p className="text-sm text-muted-foreground">
          Select the strategy that best matches your risk tolerance and target asset before creating your vault.
        </p>
      </div>

      {loading ? (
        <div role="status" aria-live="polite" className="rounded-xl border border-border/70 bg-card/50 p-4 text-sm text-muted-foreground">
          Loading available strategies from the strategy registry contract.
        </div>
      ) : null}

      {errorMessage ? (
        <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive-foreground">
          <p className="font-medium text-foreground">Unable to load strategies</p>
          <p className="mt-1 text-muted-foreground">{errorMessage}</p>
          <Button variant="outline" className="mt-3" onClick={onRetry}>
            Retry
          </Button>
        </div>
      ) : null}

      {!loading && !errorMessage ? (
        <div role="radiogroup" aria-label="Available vault strategies" className="grid gap-3">
          {strategies.map((strategy) => {
            const selected = selectedStrategyId === strategy.id;

            return (
              <button
                key={strategy.id.toString()}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onSelect(strategy.id)}
                className={[
                  'w-full rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  selected
                    ? 'border-bitcoin-500/70 bg-bitcoin-500/10 shadow-[0_0_0_1px_rgba(247,147,26,0.4)]'
                    : 'border-border/70 bg-card/50 hover:border-bitcoin-500/40 hover:bg-card/80',
                ].join(' ')}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-base font-semibold text-foreground">{strategy.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.15em] text-muted-foreground">
                      Target asset: {strategy.targetAssetSymbol}
                    </p>
                  </div>
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${riskBadgeClass(strategy.riskLabel)}`}>
                    {strategy.riskLabel}
                  </span>
                </div>

                <p className="mt-3 text-sm text-muted-foreground">{strategy.description}</p>

                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Estimated APY range</dt>
                    <dd className="mt-1 font-medium text-foreground">{strategy.estimatedApyRange}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Strategy ID</dt>
                    <dd className="mt-1 font-medium text-foreground">{strategy.id.toString()}</dd>
                  </div>
                </dl>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="flex justify-end border-t border-border/70 pt-3">
        <Button onClick={onNext} disabled={selectedStrategyId === null || loading || Boolean(errorMessage)}>
          Continue to deposit
        </Button>
      </div>
    </section>
  );
}
