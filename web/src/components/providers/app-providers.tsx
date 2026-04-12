"use client";

import * as React from 'react';

import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/components/theme-provider';

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps): JSX.Element {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      storageKey="vmind-theme"
      disableTransitionOnChange
    >
      <TooltipProvider delayDuration={120}>{children}</TooltipProvider>
      <Toaster />
    </ThemeProvider>
  );
}
