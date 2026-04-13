"use client";

import Link from 'next/link';

import { Button } from '@/components/ui/button';

interface VaultCreationSuccessStepProps {
  vaultId: bigint | null;
}

export function VaultCreationSuccessStep({ vaultId }: VaultCreationSuccessStepProps): JSX.Element {
  const vaultLabel = vaultId ? `#${vaultId.toString()}` : 'Pending indexer sync';
  const vaultDetailsHref = vaultId ? `/vaults/${vaultId.toString()}` : '/vaults';

  return (
    <section className="space-y-4" aria-labelledby="success-title">
      <div className="rounded-2xl border border-emerald-500/50 bg-emerald-500/10 p-5">
        <h2 id="success-title" className="font-[var(--font-display)] text-2xl font-semibold tracking-tight text-emerald-100">
          Vault created successfully
        </h2>
        <p className="mt-2 text-sm text-emerald-50/90">
          Your on-chain transaction has been confirmed and your vault is now active in the protocol.
        </p>

        <dl className="mt-4 rounded-lg border border-emerald-500/40 bg-background/35 p-3 text-sm">
          <dt className="text-xs uppercase tracking-[0.15em] text-emerald-200">Vault ID</dt>
          <dd className="mt-1 text-lg font-semibold text-foreground">{vaultLabel}</dd>
        </dl>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button render={<Link href={vaultDetailsHref} />}>View vault details</Button>
        <Button variant="outline" render={<Link href="/dashboard" />}>
          Return to dashboard
        </Button>
      </div>
    </section>
  );
}
