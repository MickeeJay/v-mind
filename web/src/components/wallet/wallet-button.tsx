"use client";

import * as React from 'react';
import { Copy, LogOut } from 'lucide-react';

import { ConnectWalletModal } from '@/components/wallet/connect-wallet-modal';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useWallet } from '@/hooks/use-wallet';
import { useToast } from '@/hooks/use-toast';

function truncateAddress(address: string): string {
  if (address.length <= 14) {
    return address;
  }

  return `${address.slice(0, 6)}...${address.slice(-5)}`;
}

function seedFromAddress(address: string): number {
  return [...address].reduce((accumulator, char, index) => {
    return (accumulator + char.charCodeAt(0) * (index + 1)) % 360;
  }, 0);
}

function AddressIdenticon({ address }: { address: string }): JSX.Element {
  const seed = seedFromAddress(address);
  const colorA = `hsl(${seed}, 75%, 52%)`;
  const colorB = `hsl(${(seed + 120) % 360}, 70%, 44%)`;

  return (
    <span
      className="inline-block h-5 w-5 rounded-full border border-border/70"
      style={{ background: `radial-gradient(circle at 28% 28%, ${colorA}, ${colorB})` }}
      aria-hidden="true"
    />
  );
}

export function WalletButton(): JSX.Element {
  const { address, disconnect } = useWallet();
  const { toast } = useToast();
  const [isModalOpen, setModalOpen] = React.useState(false);

  const shortAddress = address ? truncateAddress(address) : null;

  return (
    <>
      {!address ? (
        <Button className="bg-bitcoin-500 text-bitcoin-950 hover:bg-bitcoin-400" onClick={() => setModalOpen(true)}>
          Connect Wallet
        </Button>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" className="border-border/70 bg-card/70" />}>
            <AddressIdenticon address={address} />
            <span className="font-mono text-xs sm:text-sm">{shortAddress}</span>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="text-xs text-muted-foreground">Connected Wallet</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="font-mono text-xs">{address}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                const fallbackCopy = (): void => {
                  const textArea = document.createElement('textarea');
                  textArea.value = address;
                  textArea.style.position = 'fixed';
                  textArea.style.opacity = '0';
                  document.body.appendChild(textArea);
                  textArea.select();
                  document.execCommand('copy');
                  document.body.removeChild(textArea);
                };

                const copy = navigator.clipboard?.writeText
                  ? navigator.clipboard.writeText(address)
                  : Promise.resolve().then(fallbackCopy);

                void copy.then(() => {
                  toast({
                    title: 'Address copied',
                    description: 'Wallet address copied to clipboard.',
                  });
                });
              }}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy address
            </DropdownMenuItem>
            <DropdownMenuItem onClick={disconnect}>
              <LogOut className="mr-2 h-4 w-4" />
              Disconnect
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <ConnectWalletModal open={isModalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
