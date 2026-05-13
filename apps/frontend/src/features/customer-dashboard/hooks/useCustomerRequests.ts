import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../customer-auth/context/AuthContext';
import { fetchCustomerRequests, AuthError } from '../api/requests.api';

export function useCustomerRequests() {
  const { logout } = useAuth();

  return useQuery({
    queryKey: ['customerRequests'],
    queryFn: fetchCustomerRequests,
    staleTime: 30_000,
    throwOnError: (error) => {
      if (error instanceof AuthError) {
        logout();
        return false;
      }
      return false;
    },
  });
}
