import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { acceptJob } from '../api/handyman-accept-decline.api';
import { AuthError } from '../../handyman-dashboard/api/handyman-profile.api';
import { useAuth } from '../../customer-auth/context/AuthContext';

export function useAcceptJob() {
  const queryClient = useQueryClient();
  const { logout } = useAuth();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (offerId: string) => acceptJob(offerId),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['handyman-jobs'] });
      navigate(`/jobs/${data.requestId}/active`);
    },
    onError: (err: unknown) => {
      if (err instanceof AuthError) logout();
    },
  });
}
