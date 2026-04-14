import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import * as React from 'react';

import { WalletProvider } from '@/components/providers/wallet-provider';
import { ThemeProvider } from '@/components/theme-provider';

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface TestProvidersProps {
  children: React.ReactNode;
}

function TestProviders({ children }: TestProvidersProps): JSX.Element {
  const [queryClient] = React.useState(() => createTestQueryClient());

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="vmind-theme" disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <WalletProvider>{children}</WalletProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export function renderWithProviders(ui: React.ReactElement, options?: RenderOptions): RenderResult {
  return render(ui, { wrapper: TestProviders, ...options });
}