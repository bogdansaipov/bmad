import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../customer-auth/context/AuthContext';
import { fetchCategories, AuthError } from '../api/categories.api';

export function useCategories() {
  const { logout } = useAuth();

  return useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 5 * 60_000,
    throwOnError: (error) => {
      if (error instanceof AuthError) {
        logout();
        return false;
      }
      return false;
    },
  });
}
