import { UserRole } from '@prisma/client';

export class LoginResponseDto {
  userId!: string;
  email!: string;
  role!: UserRole;
  accessToken!: string;
}
