import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../customer-auth/context/AuthContext';
import { AuthError } from '../../handyman-dashboard/api/handyman-profile.api';
import { updateJobStatus } from '../api/active-job.api';

export function useUpdateJobStatus(requestId: string) {
  const queryClient = useQueryClient();
  const { logout } = useAuth();

  return useMutation({
    mutationFn: (status: string) => updateJobStatus(requestId, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['active-job', requestId] });
    },
    onError: (err: unknown) => {
      if (err instanceof AuthError) logout();
    },
  });
}
