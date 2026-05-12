import { useMutation } from '@tanstack/react-query';
import { registerUser } from '../api/auth.api';
import type { RegisterRequest } from '@handrix/contracts';

export function useRegister() {
  return useMutation({
    mutationFn: (data: RegisterRequest) => registerUser(data),
  });
}
