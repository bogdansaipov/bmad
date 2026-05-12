import { z } from 'zod';

export const UserRoleEnum = z.enum(['CUSTOMER', 'HANDYMAN']);
export type UserRole = z.infer<typeof UserRoleEnum>;
