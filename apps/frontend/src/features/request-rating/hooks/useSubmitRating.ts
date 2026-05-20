import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../customer-auth/context/AuthContext';
import { AuthError } from '../../customer-dashboard/api/requests.api';
import { submitRating } from '../api/ratings.api';

export function useSubmitRating(requestId: string) {
  const queryClient = useQueryClient();
  const { logout } = useAuth();

  return useMutation({
    mutationFn: ({ stars, shortFeedback }: { stars: number; shortFeedback?: string }) =>
      submitRating(requestId, stars, shortFeedback),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['rating-status', requestId] });
      void queryClient.invalidateQueries({ queryKey: ['customerRequests'] });
    },
    onError: (err: unknown) => {
      if (err instanceof AuthError) logout();
    },
  });
}
