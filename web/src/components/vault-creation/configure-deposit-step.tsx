"use client";

import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatMicrostx } from '@/lib/vault-creation-formatters';
import type { VaultStrategy } from '@/types/vault-creation';

interface ConfigureDepositStepProps {
  strategy: VaultStrategy;
  amountInput: string;
  onAmountInputChange: (value: string) => void;
  walletBalanceMicrostx: bigint;
  minimumDepositMicrostx: bigint;
  estimatedShares: bigint;
  sharePriceScaled: bigint;
  shareScale: bigint;
  validationMessage: string | null;
  onBack: () => void;
  onNext: () => void;
}

export function ConfigureDepositStep(props: ConfigureDepositStepProps): JSX.Element {
  const {
    strategy,
    amountInput,
    onAmountInputChange,
    walletBalanceMicrostx,
    minimumDepositMicrostx,
    estimatedShares,
    sharePriceScaled,
    shareScale,
    validationMessage,
    onBack,
    onNext,
  } = props;

  const validationId = 'deposit-validation-message';
  const helperId = 'deposit-input-helper';
  const hasValidationError = Boolean(validationMessage);

  return (
    <section className="space-y-4" aria-labelledby="configure-deposit-title">
      <div className="space-y-1">
        <h2 id="configure-deposit-title" className="font-[var(--font-display)] text-2xl font-semibold tracking-tight">
          Configure deposit amount
        </h2>
        <p className="text-sm text-muted-foreground">
          Enter the amount of {strategy.targetAssetSymbol} to deposit into strategy #{strategy.id.toString()}.
        </p>
      </div>

      <div className="rounded-xl border border-border/70 bg-card/50 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="deposit-amount">Deposit amount ({strategy.targetAssetSymbol})</Label>
            <Input
              id="deposit-amount"
              name="depositAmount"
              inputMode="decimal"
              value={amountInput}
              onChange={(event) => {
                onAmountInputChange(event.currentTarget.value);
              }}
              aria-invalid={hasValidationError}
              aria-describedby={validationMessage ? `${validationId} ${helperId}` : helperId}
              placeholder="0.00"
            />
            <p id={helperId} className="text-xs text-muted-foreground">
              Amount accepts up to 6 decimals and must satisfy protocol minimums.
            </p>
            {validationMessage ? (
              <p id={validationId} role="alert" className="text-xs text-destructive">
                {validationMessage}
              </p>
            ) : null}
          </div>

          <div className="space-y-2 rounded-lg border border-border/60 bg-background/50 p-3 text-sm">
            <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Wallet balance</p>
            <p className="font-semibold text-foreground">
              {formatMicrostx(walletBalanceMicrostx)} {strategy.targetAssetSymbol}
            </p>
            <p className="text-xs text-muted-foreground">
              Minimum required: {formatMicrostx(minimumDepositMicrostx)} {strategy.targetAssetSymbol}
            </p>
          </div>
        </div>

        <dl className="mt-4 grid gap-3 rounded-lg border border-border/60 bg-background/40 p-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Current share price</dt>
            <dd className="mt-1 font-medium text-foreground">
              {formatMicrostx(sharePriceScaled, 6)} / {formatMicrostx(shareScale, 0)} share units
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Estimated shares minted</dt>
            <dd className="mt-1 font-medium text-foreground" role="status" aria-live="polite">
              {formatMicrostx(estimatedShares, 6)} shares
            </dd>
          </div>
        </dl>
      </div>

      <div className="flex items-center justify-between border-t border-border/70 pt-3">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={hasValidationError || !amountInput.trim()}>
          Continue to review
        </Button>
      </div>
    </section>
  );
}
