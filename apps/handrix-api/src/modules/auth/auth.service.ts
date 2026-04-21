import {
  type InternalAuthRequest,
  type InternalSession,
} from '@handrix/shared-contracts';
import { Injectable } from '@nestjs/common';
import { parseAppEnv } from '../../config/env.validation';
import { findInternalStaffUser } from './internal-user-credentials';
import { issueInternalAccessToken } from './internal-auth-token';

@Injectable()
export class AuthService {
  createInternalSession(
    credentials: InternalAuthRequest,
  ): InternalSession | null {
    const env = parseAppEnv();
    const matchedUser = findInternalStaffUser(credentials, env);

    if (!matchedUser) {
      return null;
    }

    const token = issueInternalAccessToken({
      secret: env.internalAuthSecret,
      issuer: env.internalAuthIssuer,
      ttlMinutes: env.internalAuthTtlMinutes,
      user: {
        id: matchedUser.id,
        email: matchedUser.email,
        displayName: matchedUser.displayName,
        role: matchedUser.role,
      },
    });

    return {
      accessToken: token.token,
      tokenType: 'Bearer',
      issuedAt: token.issuedAt,
      expiresAt: token.expiresAt,
      user: {
        id: matchedUser.id,
        email: matchedUser.email,
        displayName: matchedUser.displayName,
        role: matchedUser.role,
      },
    };
  }
}
