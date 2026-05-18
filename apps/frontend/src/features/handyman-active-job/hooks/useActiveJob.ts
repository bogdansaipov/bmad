import { useQuery } from '@tanstack/react-query';
import { fetchActiveJob } from '../api/active-job.api';

export function useActiveJob(requestId: string) {
  return useQuery({
    queryKey: ['active-job', requestId],
    queryFn: () => fetchActiveJob(requestId),
    enabled: !!requestId,
    refetchInterval: 30_000,
  });
}
