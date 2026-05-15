import { useMutation, useQueryClient } from '@tanstack/react-query';
import { declineJob } from '../api/handyman-accept-decline.api';
import { AuthError } from '../../handyman-dashboard/api/handyman-profile.api';
import { useAuth } from '../../customer-auth/context/AuthContext';

export function useDeclineJob() {
  const queryClient = useQueryClient();
  const { logout } = useAuth();

  return useMutation({
    mutationFn: (offerId: string) => declineJob(offerId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['handyman-jobs'] });
    },
    onError: (err: unknown) => {
      if (err instanceof AuthError) logout();
    },
  });
}
