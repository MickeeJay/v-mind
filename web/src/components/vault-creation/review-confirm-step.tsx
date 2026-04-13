"use client";

import * as React from 'react';

import { Button } from '@/components/ui/button';
import { formatBpsToPercent, formatMicrostx } from '@/lib/vault-creation-formatters';
import type { VaultStrategy } from '@/types/vault-creation';

interface ReviewConfirmStepProps {
  strategy: VaultStrategy;
  depositMicrostx: bigint;
  estimatedShares: bigint;
  protocolFeeBps: bigint;
  riskAcknowledged: boolean;
  onRiskAcknowledgedChange: (acknowledged: boolean) => void;
  onBack: () => void;
  onConfirm: () => void;
  submitting: boolean;
}

export function ReviewConfirmStep(props: ReviewConfirmStepProps): JSX.Element {
  const {
    strategy,
    depositMicrostx,
    estimatedShares,
    protocolFeeBps,
    riskAcknowledged,
    onRiskAcknowledgedChange,
    onBack,
    onConfirm,
    submitting,
  } = props;

  return (
    <section className="space-y-4" aria-labelledby="review-confirm-title">
      <div className="space-y-1">
        <h2 id="review-confirm-title" className="font-[var(--font-display)] text-2xl font-semibold tracking-tight">
          Review and confirm
        </h2>
        <p className="text-sm text-muted-foreground">
          Check every parameter before opening your wallet to sign the vault creation transaction.
        </p>
      </div>

      <div className="rounded-xl border border-border/70 bg-card/50 p-4">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Selected strategy</dt>
            <dd className="mt-1 font-medium text-foreground">{strategy.name}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Target asset</dt>
            <dd className="mt-1 font-medium text-foreground">{strategy.targetAssetSymbol}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Deposit amount</dt>
            <dd className="mt-1 font-medium text-foreground">
              {formatMicrostx(depositMicrostx)} {strategy.targetAssetSymbol}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Estimated initial APY</dt>
            <dd className="mt-1 font-medium text-foreground">{strategy.estimatedApyRange}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Protocol fee rate</dt>
            <dd className="mt-1 font-medium text-foreground">{formatBpsToPercent(protocolFeeBps)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Estimated shares received</dt>
            <dd className="mt-1 font-medium text-foreground">{formatMicrostx(estimatedShares, 6)} shares</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-4 text-sm" role="note" aria-label="DeFi risk disclaimer">
        <p className="font-semibold text-amber-200">Important risk disclosure</p>
        <p className="mt-1 text-amber-100/90">
          DeFi strategies involve smart contract risk, market volatility, and execution risk. Deposits are not guaranteed
          and losses can occur.
        </p>

        <label htmlFor="acknowledge-risk" className="mt-3 flex cursor-pointer items-start gap-2 text-amber-50">
          <input
            id="acknowledge-risk"
            type="checkbox"
            checked={riskAcknowledged}
            onChange={(event) => onRiskAcknowledgedChange(event.currentTarget.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border bg-background"
            aria-required="true"
          />
          <span>I understand the risks and want to proceed with this on-chain vault creation transaction.</span>
        </label>
      </div>

      <div className="flex items-center justify-between border-t border-border/70 pt-3">
        <Button variant="outline" onClick={onBack} disabled={submitting}>
          Back
        </Button>
        <Button onClick={onConfirm} disabled={!riskAcknowledged || submitting}>
          {submitting ? 'Opening wallet...' : 'Confirm and submit'}
        </Button>
      </div>
    </section>
  );
}
