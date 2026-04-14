'use client';

import Link from 'next/link';
import * as React from 'react';
import { Copy, ExternalLink } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getExplorerContractUrl } from '@/lib/vault-detail-transactions';
import { formatBlockHeight, formatVaultDate } from '@/lib/vault-detail-formatters';
import type { VaultDetailSnapshot } from '@/types/vault-detail';

interface VaultMetadataProps {
  snapshot: VaultDetailSnapshot;
}

export function VaultMetadata({ snapshot }: VaultMetadataProps): JSX.Element {
  const { toast } = useToast();
  const relativeSharePath = `/vaults/${snapshot.vaultId.toString()}`;

  const shareUrl = React.useMemo(() => relativeSharePath, [relativeSharePath]);

  const copyShareUrl = React.useCallback(() => {
    const absoluteShareUrl = typeof window === 'undefined' ? relativeSharePath : `${window.location.origin}${relativeSharePath}`;

    const fallbackCopy = (): void => {
      const textArea = document.createElement('textarea');
      textArea.value = absoluteShareUrl;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    };

    const copy = navigator.clipboard?.writeText ? navigator.clipboard.writeText(absoluteShareUrl) : Promise.resolve().then(fallbackCopy);

    void copy.then(() => {
      toast({
        title: 'Vault link copied',
        description: 'Share this vault detail page with an advisor or teammate.',
      });
    });
  }, [relativeSharePath, toast]);

  return (
    <Card className="border-border/70 bg-card/70">
      <CardHeader className="gap-2">
        <CardDescription>Vault metadata</CardDescription>
        <CardTitle className="font-[var(--font-display)] text-xl">Immutable vault details</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div className="rounded-xl border border-border/70 bg-background/55 p-3">
            <dt className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Vault ID</dt>
            <dd className="mt-1 font-semibold text-foreground">#{snapshot.vaultId.toString()}</dd>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/55 p-3">
            <dt className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Created at</dt>
            <dd className="mt-1 font-semibold text-foreground">{formatVaultDate(snapshot.createdAt)}</dd>
            <p className="mt-1 text-xs text-muted-foreground">{formatBlockHeight(snapshot.createdAtBlock)}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/55 p-3">
            <dt className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Assigned strategy</dt>
            <dd className="mt-1 font-semibold text-foreground">{snapshot.strategy.name}</dd>
            <p className="mt-1 text-xs text-muted-foreground">{snapshot.strategy.strategyTypeLabel} strategy</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/55 p-3">
            <dt className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Receipt token</dt>
            <dd className="mt-1 break-all font-mono text-xs font-semibold text-foreground">{snapshot.receiptTokenPrincipal}</dd>
            <p className="mt-1 text-xs text-muted-foreground">{snapshot.receiptTokenName} ({snapshot.receiptTokenSymbol})</p>
          </div>
        </dl>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={copyShareUrl}>
            <Copy className="mr-2 h-4 w-4" />
            Copy share link
          </Button>
          <Button variant="outline" render={<Link href={getExplorerContractUrl(snapshot.vaultContractPrincipal)} target="_blank" rel="noreferrer" />}>
            <ExternalLink className="mr-2 h-4 w-4" />
            View contract on Explorer
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">Share URL: {shareUrl}</p>
      </CardContent>
    </Card>
  );
}
