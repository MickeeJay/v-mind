"use client";

import { Menu } from 'lucide-react';
import Link from 'next/link';

import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { WalletButton } from '@/components/wallet/wallet-button';
import { useWallet } from '@/hooks/use-wallet';

interface TopNavProps {
  onMenuClick: () => void;
}

function NetworkBadge({ network }: { network: string }): JSX.Element {
  return (
    <span className="inline-flex items-center rounded-full border border-bitcoin-500/40 bg-bitcoin-500/10 px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-bitcoin-300">
      {network}
    </span>
  );
}

export function TopNav({ onMenuClick }: TopNavProps): JSX.Element {
  const { network } = useWallet();

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between gap-3 px-4 md:px-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="md:hidden" onClick={onMenuClick}>
            <Menu className="h-4 w-4" />
            <span className="sr-only">Toggle sidebar</span>
          </Button>

          <Link href="/dashboard" className="group inline-flex items-center gap-2">
            <span className="inline-block h-8 w-8 rounded-lg bg-gradient-to-br from-bitcoin-400 to-bitcoin-600 shadow-[0_0_22px_rgba(247,147,26,0.45)]" />
            <div>
              <p className="font-semibold leading-none tracking-tight">V-Mind</p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Bitcoin L2 DeFi</p>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {network ? <NetworkBadge network={network} /> : null}
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
