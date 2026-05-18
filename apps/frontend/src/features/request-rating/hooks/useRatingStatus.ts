import { useQuery } from '@tanstack/react-query';
import { fetchRatingStatus } from '../api/ratings.api';

export function useRatingStatus(requestId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['rating-status', requestId],
    queryFn: () => fetchRatingStatus(requestId),
    enabled: !!requestId && enabled,
    staleTime: 60_000,
  });
}
