import { useQuery } from '@tanstack/react-query';

import { fetchStrategyBrowserStrategies } from '@/lib/strategy-browser-api';

export function useStrategyBrowserQuery(senderAddress?: string) {
  return useQuery({
    queryKey: ['strategy-browser-strategies', senderAddress ?? null],
    queryFn: () => fetchStrategyBrowserStrategies(senderAddress),
  });
}