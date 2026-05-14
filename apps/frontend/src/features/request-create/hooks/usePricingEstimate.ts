import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../customer-auth/context/AuthContext';
import { AuthError } from '../api/categories.api';
import { fetchPricingEstimate } from '../api/requests.api';

export function usePricingEstimate(categoryId: string | null) {
  const { logout } = useAuth();

  return useQuery({
    queryKey: ['pricing-estimate', categoryId],
    queryFn: () => fetchPricingEstimate(categoryId!),
    enabled: !!categoryId,
    staleTime: 5 * 60_000,
    throwOnError: (error) => {
      if (error instanceof AuthError) {
        logout();
      }
      return false;
    },
  });
}
