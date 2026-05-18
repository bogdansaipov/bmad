import { useQuery } from '@tanstack/react-query';
import { fetchActiveJob } from '../api/active-job.api';

export function useActiveJob(requestId: string) {
  return useQuery({
    queryKey: ['active-job', requestId],
    queryFn: () => fetchActiveJob(requestId),
    // WebSocket (story 4.3) handles live updates; refetch on reconnect via invalidateQueries
    refetchInterval: false,
    staleTime: 0,
    enabled: !!requestId,
  });
}
