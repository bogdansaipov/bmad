import { UserRole } from '@prisma/client';

export class RegisterResponseDto {
  userId!: string;
  email!: string;
  role!: UserRole;
  accessToken!: string;
}
