"use client";

import * as React from 'react';

import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

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
      <TooltipProvider delay={120}>{children}</TooltipProvider>
      <Toaster />
    </ThemeProvider>
  );
}
