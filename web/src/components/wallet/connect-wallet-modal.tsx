"use client";

import * as React from 'react';
import { DEFAULT_PROVIDERS } from '@stacks/connect';
import { Download, PlugZap, ShieldCheck } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/hooks/use-wallet';
import {
  type WalletProviderType,
  WALLET_PROVIDER_IDS,
  getInstalledWalletProviders,
  isWalletProviderInstalled,
} from '@/lib/wallet-providers';

interface ConnectWalletModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WALLET_OPTION_DETAILS: Array<{
  type: WalletProviderType;
  title: string;
  description: string;
  installUrl: string;
}> = [
  {
    type: 'leather',
    title: 'Leather',
    description: 'Secure Stacks wallet for browser-based DeFi and contract interactions.',
    installUrl: 'https://leather.io/install-extension',
  },
  {
    type: 'xverse',
    title: 'Xverse',
    description: 'Popular Bitcoin and Stacks wallet with extension and mobile support.',
    installUrl: 'https://www.xverse.app/download',
  },
];

function getWalletIcon(providerType: WalletProviderType): string {
  const providerId = WALLET_PROVIDER_IDS[providerType];
  const provider = DEFAULT_PROVIDERS.find((entry) => entry.id === providerId);
  return provider?.icon ?? '';
}

export function ConnectWalletModal({ open, onOpenChange }: ConnectWalletModalProps): JSX.Element {
  const { address, connect, isConnecting, error } = useWallet();
  const [installedProviders, setInstalledProviders] = React.useState<WalletProviderType[]>([]);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    setInstalledProviders(getInstalledWalletProviders());
  }, [open]);

  React.useEffect(() => {
    if (!open || !address) {
      return;
    }

    onOpenChange(false);
  }, [address, onOpenChange, open]);

  const noExtensionsInstalled = installedProviders.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Connect a Stacks Wallet</DialogTitle>
          <DialogDescription>
            Choose a wallet provider to access V-Mind vault operations on Stacks.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 pt-2">
          {WALLET_OPTION_DETAILS.map((wallet) => {
            const isInstalled = isWalletProviderInstalled(wallet.type);
            const icon = getWalletIcon(wallet.type);

            return (
              <div
                key={wallet.type}
                className="rounded-xl border border-border/70 bg-card/60 p-3"
              >
                <div className="flex items-start gap-3">
                  {icon ? (
                    <img src={icon} alt={`${wallet.title} logo`} className="h-9 w-9 rounded-md" />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                      <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-none">{wallet.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{wallet.description}</p>
                  </div>

                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      isInstalled
                        ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                        : 'border border-amber-500/30 bg-amber-500/10 text-amber-300'
                    }`}
                  >
                    {isInstalled ? 'Detected' : 'Not detected'}
                  </span>
                </div>

                <div className="mt-3 flex justify-end gap-2">
                  {isInstalled ? (
                    <Button
                      disabled={isConnecting}
                      onClick={() => {
                        void connect(wallet.type);
                      }}
                      className="bg-bitcoin-500 text-bitcoin-950 hover:bg-bitcoin-400"
                    >
                      <PlugZap className="mr-2 h-4 w-4" />
                      {isConnecting ? 'Connecting...' : `Connect ${wallet.title}`}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      render={<a href={wallet.installUrl} target="_blank" rel="noreferrer" />}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Install
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {noExtensionsInstalled ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
            No supported extension was detected in this browser. Install Leather or Xverse, then retry connection.
          </div>
        ) : null}

        {error ? <p className="text-xs text-rose-300">{error}</p> : null}
      </DialogContent>
    </Dialog>
  );
}
