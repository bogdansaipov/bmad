import { timingSafeEqual } from 'node:crypto';
import type { AppEnv } from '../../config/env.validation';
import type { InternalStaffUser } from './internal-auth.types';

function matchesSecret(input: string, expected: string) {
  const providedBuffer = Buffer.from(input);
  const expectedBuffer = Buffer.from(expected);

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
}

export function findInternalStaffUser(
  credentials: { email: string; password: string },
  env: AppEnv,
): InternalStaffUser | null {
  const normalizedEmail = credentials.email.trim().toLowerCase();

  for (const user of env.internalStaffUsers) {
    if (normalizedEmail !== user.email.toLowerCase()) {
      continue;
    }

    if (!matchesSecret(credentials.password, user.password)) {
      return null;
    }

    return user;
  }

  return null;
}
