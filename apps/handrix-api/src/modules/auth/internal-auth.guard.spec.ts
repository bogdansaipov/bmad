import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from './auth.service';
import { InternalAuthGuard } from './internal-auth.guard';
import { InternalRolesGuard } from './internal-roles.guard';

function createHttpExecutionContext(request: {
  headers?: Record<string, string>;
  user?: unknown;
}) {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => 'handler',
    getClass: () => 'class',
  } as never;
}

describe('Internal auth guards', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      HANDRIX_ENV: 'test',
      HANDRIX_INTERNAL_AUTH_SECRET: 'test-internal-auth-secret',
      HANDRIX_INTERNAL_AUTH_ISSUER: 'handrix-test-suite',
      HANDRIX_OPS_EMAIL: 'ops@handrix.local',
      HANDRIX_OPS_PASSWORD: 'ops-demo-pass',
      HANDRIX_SUPPORT_EMAIL: 'support@handrix.local',
      HANDRIX_SUPPORT_PASSWORD: 'support-demo-pass',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('rejects protected access when the bearer token is missing', () => {
    const guard = new InternalAuthGuard();

    expect(() =>
      guard.canActivate(
        createHttpExecutionContext({
          headers: {},
        }),
      ),
    ).toThrow(UnauthorizedException);
  });

  it('accepts a valid ops bearer token and attaches the authenticated user', () => {
    const authService = new AuthService();
    const guard = new InternalAuthGuard();
    const session = authService.createInternalSession({
      email: 'ops@handrix.local',
      password: 'ops-demo-pass',
    });

    const request = {
      headers: {
        authorization: `Bearer ${session!.accessToken}`,
      },
    } as { headers: Record<string, string>; user?: unknown };

    expect(guard.canActivate(createHttpExecutionContext(request))).toBe(true);
    expect(request.user).toEqual({
      id: 'ops-default-user',
      email: 'ops@handrix.local',
      displayName: 'Operations Coordinator',
      role: 'ops',
    });
  });

  it('rejects authenticated users with the wrong role for ops routes', () => {
    const reflector = {
      getAllAndOverride: () => ['ops'],
    } as unknown as Reflector;
    const guard = new InternalRolesGuard(reflector);

    try {
      guard.canActivate(
        createHttpExecutionContext({
          headers: {},
          user: {
            id: 'support-default-user',
            email: 'support@handrix.local',
            displayName: 'Support Coordinator',
            role: 'support',
          },
        }),
      );
      throw new Error('Expected the role guard to reject a support user.');
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as ForbiddenException).getResponse()).toMatchObject({
        error: {
          code: 'INTERNAL_AUTH_FORBIDDEN',
        },
      });
    }
  });

  it('allows authenticated users with the required ops role', () => {
    const reflector = {
      getAllAndOverride: () => ['ops'],
    } as unknown as Reflector;
    const guard = new InternalRolesGuard(reflector);

    expect(
      guard.canActivate(
        createHttpExecutionContext({
          headers: {},
          user: {
            id: 'ops-default-user',
            email: 'ops@handrix.local',
            displayName: 'Operations Coordinator',
            role: 'ops',
          },
        }),
      ),
    ).toBe(true);
  });
});
