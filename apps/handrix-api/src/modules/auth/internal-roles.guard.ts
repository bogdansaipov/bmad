import { createErrorResponse } from '@handrix/shared-contracts';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { INTERNAL_ROLES_KEY } from './roles.decorator';
import type { AuthenticatedInternalRequest } from './internal-auth.types';

@Injectable()
export class InternalRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      INTERNAL_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedInternalRequest>();
    const currentUser = request.user;

    if (!currentUser || !requiredRoles.includes(currentUser.role)) {
      throw new ForbiddenException(
        createErrorResponse({
          code: 'INTERNAL_AUTH_FORBIDDEN',
          message:
            'Your signed account is not allowed to access this operations area.',
          recoveryHint:
            'Use an authorized staff account for this protected route.',
        }),
      );
    }

    return true;
  }
}
