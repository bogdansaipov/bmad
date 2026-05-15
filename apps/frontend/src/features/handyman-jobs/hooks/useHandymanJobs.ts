import { useQuery } from '@tanstack/react-query';
import { fetchAvailableJobs } from '../api/handyman-jobs.api';

export function useHandymanJobs() {
  return useQuery({
    queryKey: ['handyman-jobs'],
    queryFn: fetchAvailableJobs,
    refetchInterval: 15_000,
    staleTime: 15_000,
  });
}
