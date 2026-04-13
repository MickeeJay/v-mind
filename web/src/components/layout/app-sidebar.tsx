"use client";

import { BarChart3, Layers3, ShieldCheck, WalletCards, X } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: BarChart3,
  },
  {
    label: 'Vaults',
    href: '/vaults',
    icon: WalletCards,
  },
  {
    label: 'Strategies',
    href: '/strategies',
    icon: Layers3,
  },
  {
    label: 'Security',
    href: '/security',
    icon: ShieldCheck,
  },
];

export function AppSidebar({ isOpen, onClose }: AppSidebarProps): JSX.Element {
  return (
    <>
      {isOpen ? <button aria-label="Close sidebar" className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={onClose} /> : null}

      <aside
        className={cn(
          'vm-panel fixed inset-y-0 left-0 z-50 w-72 rounded-none border-r p-4 transition-transform md:sticky md:top-24 md:block md:h-[calc(100dvh-7rem)] md:w-64 md:rounded-2xl md:border md:border-border/70 md:bg-card/65',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        <div className="mb-6 flex items-center justify-between md:hidden">
          <span className="text-sm font-semibold tracking-wide text-muted-foreground">Navigation</span>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
            <span className="sr-only">Close navigation</span>
          </Button>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.label}
                href={item.href}
                className="group flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm text-muted-foreground transition hover:border-border/70 hover:bg-muted/50 hover:text-foreground"
                onClick={onClose}
              >
                <Icon className="h-4 w-4 text-bitcoin-400 transition group-hover:text-bitcoin-500" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 rounded-xl border border-border/70 bg-muted/40 p-3">
          <p className="text-xs uppercase tracking-[0.18em] text-bitcoin-400">Risk Engine</p>
          <p className="mt-2 text-sm text-muted-foreground">Circuit breakers and strategy guardrails are active for connected vaults.</p>
        </div>
      </aside>
    </>
  );
}
