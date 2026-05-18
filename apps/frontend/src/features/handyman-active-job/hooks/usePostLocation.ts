import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../../customer-auth/context/AuthContext';
import { AuthError } from '../../handyman-dashboard/api/handyman-profile.api';
import { postLocation } from '../api/active-job.api';

export function usePostLocation(requestId: string) {
  const { logout } = useAuth();

  return useMutation({
    mutationFn: ({ lat, lng }: { lat: number; lng: number }) => postLocation(requestId, lat, lng),
    onError: (err: unknown) => {
      if (err instanceof AuthError) logout();
    },
  });
}
