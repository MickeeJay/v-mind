import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { RenderOptions } from '@testing-library/react';

import { ThemeProvider } from '@/components/theme-provider';
import { WalletProvider } from '@/components/providers/wallet-provider';

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

export function renderWithProviders(ui: React.ReactElement, options?: RenderOptions) {
  return render(ui, { wrapper: TestProviders, ...options });
}