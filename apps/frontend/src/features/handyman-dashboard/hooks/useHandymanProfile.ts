import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { HandymanProfileSetupResponse, UpdateHandymanProfileRequest } from '@handrix/contracts';
import { useAuth } from '../../customer-auth/context/AuthContext';
import {
  AuthError,
  fetchHandymanCategories,
  fetchHandymanProfile,
  updateHandymanProfile,
} from '../api/handyman-profile.api';

const PROFILE_QUERY_KEY = ['handymanProfile'] as const;
const CATEGORIES_QUERY_KEY = ['handymanCategories'] as const;

export function useHandymanProfile() {
  const { logout } = useAuth();
  return useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: fetchHandymanProfile,
    staleTime: 30_000,
    throwOnError: (error) => {
      if (error instanceof AuthError) {
        logout();
      }
      return false;
    },
  });
}

export function useHandymanCategoriesQuery() {
  const { logout } = useAuth();
  return useQuery({
    queryKey: CATEGORIES_QUERY_KEY,
    queryFn: fetchHandymanCategories,
    staleTime: 5 * 60_000,
    throwOnError: (error) => {
      if (error instanceof AuthError) {
        logout();
      }
      return false;
    },
  });
}

export function useUpdateHandymanProfile() {
  const queryClient = useQueryClient();
  const { logout } = useAuth();
  return useMutation({
    mutationFn: (payload: UpdateHandymanProfileRequest) => updateHandymanProfile(payload),
    onSuccess: (data: HandymanProfileSetupResponse) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY, data);
    },
    onError: (error) => {
      if (error instanceof AuthError) {
        logout();
      }
    },
  });
}
