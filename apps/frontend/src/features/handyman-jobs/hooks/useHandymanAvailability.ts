import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../customer-auth/context/AuthContext';
import { AuthError } from '../../handyman-dashboard/api/handyman-profile.api';
import { updateAvailability } from '../api/handyman-availability.api';

export function useHandymanAvailability() {
  const queryClient = useQueryClient();
  const { logout } = useAuth();

  return useMutation({
    mutationFn: (status: 'online' | 'offline') => updateAvailability(status),
    onSuccess: (data) => {
      queryClient.setQueryData(['handymanProfile'], data);
    },
    onError: (err) => {
      if (err instanceof AuthError) logout();
    },
  });
}
