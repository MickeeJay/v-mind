"use client";

import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

interface AppQueryProviderProps {
  children: React.ReactNode;
}

function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 30_000,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

export function AppQueryProvider({ children }: AppQueryProviderProps): JSX.Element {
  const [queryClient] = React.useState(() => createAppQueryClient());

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}