"use client";

import { AlertTriangle } from 'lucide-react';

import { useWallet } from '@/hooks/use-wallet';

function formatNetworkLabel(network: string): string {
  return network.charAt(0).toUpperCase() + network.slice(1);
}

export function NetworkMismatchBanner(): JSX.Element | null {
  const { address, network, expectedNetwork, networkMismatch } = useWallet();

  if (!address || !network || !networkMismatch) {
    return null;
  }

  return (
    <div
      className="sticky top-16 z-20 border-b border-rose-700/40 bg-rose-950/70 backdrop-blur"
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="mx-auto flex w-full max-w-[1440px] items-center gap-2 px-4 py-2 text-sm text-rose-100 md:px-6">
        <AlertTriangle className="h-4 w-4 shrink-0 text-rose-300" />
        <p>
          Network mismatch detected. Your wallet is connected to {formatNetworkLabel(network)} while V-Mind expects
          {' '}
          {formatNetworkLabel(expectedNetwork)}. Switch your wallet network before continuing.
        </p>
      </div>
    </div>
  );
}
