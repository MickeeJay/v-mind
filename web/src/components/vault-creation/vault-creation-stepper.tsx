"use client";

import * as React from 'react';

import type { VaultCreationStep } from '@/types/vault-creation';

const STEPS: Array<{ id: VaultCreationStep; label: string }> = [
  { id: 1, label: 'Choose strategy' },
  { id: 2, label: 'Configure deposit' },
  { id: 3, label: 'Review and confirm' },
  { id: 4, label: 'Transaction pending' },
  { id: 5, label: 'Success' },
];

interface VaultCreationStepperProps {
  currentStep: VaultCreationStep;
}

function getStepState(step: VaultCreationStep, currentStep: VaultCreationStep): 'complete' | 'current' | 'upcoming' {
  if (step < currentStep) {
    return 'complete';
  }

  if (step === currentStep) {
    return 'current';
  }

  return 'upcoming';
}

export function VaultCreationStepper({ currentStep }: VaultCreationStepperProps): JSX.Element {
  return (
    <nav aria-label="Vault creation progress" className="rounded-xl border border-border/70 bg-card/40 p-3 sm:p-4">
      <ol className="grid gap-2 sm:grid-cols-5 sm:gap-3">
        {STEPS.map((step) => {
          const state = getStepState(step.id, currentStep);
          const isCurrent = state === 'current';
          const isComplete = state === 'complete';

          return (
            <li
              key={step.id}
              aria-current={isCurrent ? 'step' : undefined}
              className="rounded-lg border border-border/60 bg-background/40 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span
                  className={[
                    'inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold',
                    isComplete ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-300' : '',
                    isCurrent ? 'border-bitcoin-500/70 bg-bitcoin-500/20 text-bitcoin-300' : '',
                    state === 'upcoming' ? 'border-border/70 bg-muted/50 text-muted-foreground' : '',
                  ].join(' ')}
                >
                  {step.id}
                </span>

                <p className={isCurrent ? 'text-sm font-semibold text-foreground' : 'text-sm text-muted-foreground'}>{step.label}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
