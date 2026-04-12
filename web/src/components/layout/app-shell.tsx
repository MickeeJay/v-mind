"use client";

import * as React from 'react';

import { AppFooter } from '@/components/layout/app-footer';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { TopNav } from '@/components/layout/top-nav';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps): JSX.Element {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  return (
    <div className="relative min-h-screen">
      <div className="vm-grid-overlay" aria-hidden="true" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <TopNav onMenuClick={() => setIsSidebarOpen((current) => !current)} />

        <div className="mx-auto flex w-full max-w-[1440px] flex-1 gap-4 px-4 py-4 md:px-6 md:py-6">
          <AppSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

          <main className="vm-panel relative flex-1 overflow-hidden rounded-2xl border border-border/70 p-4 sm:p-6">
            {children}
          </main>
        </div>

        <AppFooter />
      </div>
    </div>
  );
}
