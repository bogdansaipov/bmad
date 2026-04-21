import { createErrorResponse } from '@handrix/shared-contracts';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { parseAppEnv } from '../../config/env.validation';
import { validateInternalAccessToken } from './internal-auth-token';
import type { AuthenticatedInternalRequest } from './internal-auth.types';

@Injectable()
export class InternalAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedInternalRequest>();
    const authorizationHeader = request.headers.authorization;

    if (!authorizationHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        createErrorResponse({
          code: 'INTERNAL_AUTH_REQUIRED',
          message: 'Internal access requires a valid signed session.',
          recoveryHint:
            'Sign in with an authorized staff account and try again.',
        }),
      );
    }

    const token = authorizationHeader.slice('Bearer '.length).trim();

    if (!token) {
      throw new UnauthorizedException(
        createErrorResponse({
          code: 'INTERNAL_AUTH_REQUIRED',
          message: 'Internal access requires a valid signed session.',
          recoveryHint:
            'Sign in with an authorized staff account and try again.',
        }),
      );
    }

    try {
      const env = parseAppEnv();

      request.user = validateInternalAccessToken({
        token,
        secret: env.internalAuthSecret,
        issuer: env.internalAuthIssuer,
      });

      return true;
    } catch {
      throw new UnauthorizedException(
        createErrorResponse({
          code: 'INTERNAL_AUTH_INVALID',
          message: 'That internal session is no longer valid.',
          recoveryHint:
            'Sign in again to continue with protected operations access.',
        }),
      );
    }
  }
}
