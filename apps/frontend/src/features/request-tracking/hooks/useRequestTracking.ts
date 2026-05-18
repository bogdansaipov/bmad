import { useQuery } from '@tanstack/react-query';
import { fetchRequestTracking } from '../api/request-tracking.api';

export function useRequestTracking(requestId: string) {
  return useQuery({
    queryKey: ['request-tracking', requestId],
    queryFn: () => fetchRequestTracking(requestId),
    refetchInterval: 30_000,
    enabled: !!requestId,
  });
}
