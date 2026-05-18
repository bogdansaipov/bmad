import { useQuery } from '@tanstack/react-query';
import { fetchRequestTracking } from '../api/request-tracking.api';

export function useRequestTracking(requestId: string) {
  return useQuery({
    queryKey: ['request-tracking', requestId],
    queryFn: () => fetchRequestTracking(requestId),
    // WebSocket (story 4.3) handles live updates; refetch on reconnect via invalidateQueries
    refetchInterval: false,
    staleTime: 0,
    enabled: !!requestId,
  });
}
