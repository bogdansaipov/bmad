import { useQuery } from '@tanstack/react-query';
import { fetchHandymanHistory } from '../api/handyman-history.api';

export function useHandymanHistory() {
  return useQuery({
    queryKey: ['handyman-history'],
    queryFn: fetchHandymanHistory,
  });
}
