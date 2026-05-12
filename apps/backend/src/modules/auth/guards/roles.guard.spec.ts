import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthenticatedUser } from '../types/authenticated-user';

function makeContext(user: AuthenticatedUser | undefined, handler: object = {}, controller: object = {}): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => controller,
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('open route (no @Roles metadata) → allow', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx = makeContext({ userId: 'u1', email: 'a@b.com', role: UserRole.CUSTOMER });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('matching role → allow', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.CUSTOMER]);
    const ctx = makeContext({ userId: 'u1', email: 'a@b.com', role: UserRole.CUSTOMER });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('mismatching role → deny (returns false)', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.HANDYMAN]);
    const ctx = makeContext({ userId: 'u1', email: 'a@b.com', role: UserRole.CUSTOMER });

    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('missing request.user → throws UnauthorizedException', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.CUSTOMER]);
    const ctx = makeContext(undefined);

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('reads metadata from handler with ROLES_KEY', () => {
    const spy = jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.CUSTOMER]);
    const handler = {};
    const controller = {};
    const ctx = makeContext({ userId: 'u1', email: 'a@b.com', role: UserRole.CUSTOMER }, handler, controller);

    guard.canActivate(ctx);

    expect(spy).toHaveBeenCalledWith(ROLES_KEY, [handler, controller]);
  });
});
