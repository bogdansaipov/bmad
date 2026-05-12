import { useMutation } from '@tanstack/react-query';
import type { LoginRequest } from '@handrix/contracts';
import { loginUser } from '../api/auth.api';

export function useLogin() {
  return useMutation({
    mutationFn: (data: LoginRequest) => loginUser(data),
  });
}
