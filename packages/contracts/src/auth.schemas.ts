import { z } from 'zod';
import { UserRoleEnum } from './user.schemas';

export const RegisterRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: UserRoleEnum,
  displayName: z.string().min(2).max(80),
});

export const RegisterResponseSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  role: UserRoleEnum,
  accessToken: z.string(),
});

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
});

export const LoginResponseSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  role: UserRoleEnum,
  accessToken: z.string(),
});

export const SessionResponseSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  role: UserRoleEnum,
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type SessionResponse = z.infer<typeof SessionResponseSchema>;
