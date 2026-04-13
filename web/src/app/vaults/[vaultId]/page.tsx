import Link from 'next/link';

import { Button } from '@/components/ui/button';

interface VaultDetailsPageProps {
  params: {
    vaultId: string;
  };
}

export default function VaultDetailsPage({ params }: VaultDetailsPageProps): JSX.Element {
  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-border/70 bg-card/60 p-4">
        <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Vault details</p>
        <h1 className="mt-1 font-[var(--font-display)] text-2xl font-semibold tracking-tight">Vault #{params.vaultId}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Detailed analytics and management controls for this vault will appear here as the dashboard expands.
        </p>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" render={<Link href="/vaults" />}>
          Back to vault creation
        </Button>
        <Button render={<Link href="/dashboard" />}>Go to dashboard</Button>
      </div>
    </section>
  );
}
