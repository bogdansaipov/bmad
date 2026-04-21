import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../auth/auth.service';
import { InternalAuthGuard } from '../auth/internal-auth.guard';
import { InternalRolesGuard } from '../auth/internal-roles.guard';
import type { AuthenticatedInternalRequest } from '../auth/internal-auth.types';
import { createHttpExecutionContext } from '../../../test/test-utils';
import { RequestStoreService } from '../requests/request-store.service';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';

function createSupportService() {
  return new SupportService({} as RequestStoreService);
}

describe('SupportController', () => {
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

  it('returns the protected support session in the shared success envelope', () => {
    const supportService = createSupportService();
    const controller = new SupportController(supportService);

    const response = controller.getSession({
      user: {
        id: 'support-default-user',
        email: 'support@handrix.local',
        displayName: 'Support Coordinator',
        role: 'support',
      },
    } as AuthenticatedInternalRequest);

    expect(response.data).toEqual({
      scope: 'support',
      message: 'Support access granted.',
      user: {
        id: 'support-default-user',
        email: 'support@handrix.local',
        displayName: 'Support Coordinator',
        role: 'support',
      },
    });
    expect(typeof response.meta?.generatedAt).toBe('string');
  });

  it('returns the search envelope for a valid query', async () => {
    const supportService = createSupportService();
    const searchSpy = jest
      .spyOn(supportService, 'searchRequests')
      .mockResolvedValue({
        items: [
          {
            publicId: 'hrx_abc',
            issueLabel: 'Slow drain',
            addressSummary: '15 Spring Street, New York',
            currentPublicStatusLabel: 'Request received',
            currentPublicStatusDetail:
              'Our team is reviewing your issue details and service location so we can confirm the best next step.',
            currentInternalLifecycleLabel: 'Intake in review',
            currentInternalLifecycleDetail:
              'Operations is still reviewing the intake details before assignment.',
            receivedAt: '2026-04-20T13:00:00.000Z',
            lastUpdatedAt: '2026-04-20T13:05:00.000Z',
            latestChangeSummary:
              'Customer confirmed the anonymous request through the guided review flow.',
            currentAssignmentOwnerLabel: null,
            interventionLabel: null,
          },
        ],
        summary: { totalMatched: 1, limitReached: false },
        refreshedAt: '2026-04-21T10:00:00.000Z',
        query: { q: 'hrx_', normalizedQ: 'hrx_', limit: 25 },
      });

    const controller = new SupportController(supportService);
    const response = await controller.getRequests({ q: 'hrx_' });

    expect(searchSpy).toHaveBeenCalledWith({ q: 'hrx_' });
    expect(response.data.items).toHaveLength(1);
    expect(response.data.items[0]).toMatchObject({ publicId: 'hrx_abc' });
    expect(typeof response.meta?.generatedAt).toBe('string');
  });

  it('short-circuits empty queries without scanning the store', async () => {
    const supportService = createSupportService();
    const searchSpy = jest
      .spyOn(supportService, 'searchRequests')
      .mockResolvedValue({
        items: [],
        summary: { totalMatched: 0, limitReached: false },
        refreshedAt: '2026-04-21T10:00:00.000Z',
        query: { q: null, normalizedQ: '', limit: 25 },
      });

    const controller = new SupportController(supportService);
    const response = await controller.getRequests({});

    expect(searchSpy).toHaveBeenCalledWith({});
    expect(response.data.items).toEqual([]);
    expect(response.data.summary.totalMatched).toBe(0);
  });

  it('rejects a non-numeric limit with SUPPORT_SEARCH_QUERY_INVALID', async () => {
    const supportService = createSupportService();
    const controller = new SupportController(supportService);

    try {
      await controller.getRequests({ q: 'hrx', limit: 'not-a-number' });
      throw new Error('Expected the controller to throw.');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const body = (error as BadRequestException).getResponse();
      expect(body).toMatchObject({
        error: {
          code: 'SUPPORT_SEARCH_QUERY_INVALID',
        },
      });
    }
  });

  it('rejects a limit greater than 50 with SUPPORT_SEARCH_QUERY_INVALID', async () => {
    const supportService = createSupportService();
    const controller = new SupportController(supportService);

    try {
      await controller.getRequests({ limit: '999' });
      throw new Error('Expected the controller to throw.');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const body = (error as BadRequestException).getResponse();
      expect(body).toMatchObject({
        error: { code: 'SUPPORT_SEARCH_QUERY_INVALID' },
      });
    }
  });

  it('returns the minimal support request detail envelope for an existing record', async () => {
    const supportService = createSupportService();
    jest.spyOn(supportService, 'getRequestDetail').mockResolvedValue({
      publicId: 'hrx_abc',
      issueTypeId: 'slow-drain',
      issueLabel: 'Slow drain',
      createdAt: '2026-04-20T13:00:00.000Z',
      serviceLocation: {
        addressLine1: '15 Spring Street',
        city: 'New York',
        postalCode: '10011',
        unitOrAccessNote: '',
        locationDetails: '',
      },
      currentState: {
        lifecycleState: 'intake_in_review',
        lifecycleStateLabel: 'Intake in review',
        lifecycleStateDetail:
          'Operations is still reviewing the intake details before assignment.',
        publicStatus: 'received',
        publicStatusLabel: 'Request received',
        publicStatusDetail:
          'Our team is reviewing your issue details and service location so we can confirm the best next step.',
      },
      latestChangeSummary:
        'Customer confirmed the anonymous request through the guided review flow.',
      currentAssignmentOwnerLabel: null,
      interventionLabel: null,
      lastUpdatedAt: '2026-04-20T13:05:00.000Z',
    });

    const controller = new SupportController(supportService);
    const response = await controller.getRequestDetail('hrx_abc');

    expect(response.data.publicId).toBe('hrx_abc');
    expect(response.data).not.toHaveProperty('history');
    expect(response.data).not.toHaveProperty('intakeAnswers');
    expect(response.data).not.toHaveProperty('customerContext');
    expect(typeof response.meta?.generatedAt).toBe('string');
  });

  it('throws 404 with SUPPORT_REQUEST_NOT_FOUND when the public id is unknown', async () => {
    const supportService = createSupportService();
    jest.spyOn(supportService, 'getRequestDetail').mockResolvedValue(null);

    const controller = new SupportController(supportService);

    try {
      await controller.getRequestDetail('hrx_missing');
      throw new Error('Expected the controller to throw.');
    } catch (error) {
      expect(error).toBeInstanceOf(NotFoundException);
      const body = (error as NotFoundException).getResponse();
      expect(body).toMatchObject({
        error: { code: 'SUPPORT_REQUEST_NOT_FOUND' },
      });
    }
  });

  it('accepts a valid support bearer token through the internal auth guard', () => {
    const authService = new AuthService();
    const guard = new InternalAuthGuard();
    const session = authService.createInternalSession({
      email: 'support@handrix.local',
      password: 'support-demo-pass',
    });

    const request = {
      headers: {
        authorization: `Bearer ${session!.accessToken}`,
      },
    } as { headers: Record<string, string>; user?: unknown };

    expect(guard.canActivate(createHttpExecutionContext(request))).toBe(true);
    expect(request.user).toEqual({
      id: 'support-default-user',
      email: 'support@handrix.local',
      displayName: 'Support Coordinator',
      role: 'support',
    });
  });

  it('rejects ops-role users from reaching support-only routes with 403 and leaks no request data', () => {
    const reflector = {
      getAllAndOverride: () => ['support'],
    } as unknown as Reflector;
    const guard = new InternalRolesGuard(reflector);

    try {
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
      );
      throw new Error('Expected the role guard to reject an ops user.');
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenException);
      const responseBody = (error as ForbiddenException).getResponse();
      expect(responseBody).toMatchObject({
        error: {
          code: 'INTERNAL_AUTH_FORBIDDEN',
        },
      });
      expect(responseBody).not.toHaveProperty('data');
      expect(responseBody).not.toHaveProperty('publicId');
      expect(responseBody).not.toHaveProperty('request');
      expect(JSON.stringify(responseBody)).not.toContain('hrx_');
    }
  });

  it('allows support users through the role guard for support routes', () => {
    const reflector = {
      getAllAndOverride: () => ['support'],
    } as unknown as Reflector;
    const guard = new InternalRolesGuard(reflector);

    expect(
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
      ),
    ).toBe(true);
  });

  it('rejects unauthenticated callers with 401 at the auth guard and leaks no request data', () => {
    const guard = new InternalAuthGuard();

    try {
      guard.canActivate(
        createHttpExecutionContext({
          headers: {},
        }),
      );
      throw new Error(
        'Expected the auth guard to reject an unauthenticated caller.',
      );
    } catch (error) {
      expect(error).toBeInstanceOf(UnauthorizedException);
      const responseBody = (error as UnauthorizedException).getResponse();
      expect(responseBody).toMatchObject({
        error: { code: 'INTERNAL_AUTH_REQUIRED' },
      });
      expect(responseBody).not.toHaveProperty('data');
      expect(responseBody).not.toHaveProperty('publicId');
      expect(responseBody).not.toHaveProperty('request');
    }
  });

  it('rejects a malformed bearer token with 401 at the auth guard', () => {
    const guard = new InternalAuthGuard();

    try {
      guard.canActivate(
        createHttpExecutionContext({
          headers: {
            authorization: 'Bearer not.a.real.jwt.token',
          },
        }),
      );
      throw new Error(
        'Expected the auth guard to reject a malformed bearer token.',
      );
    } catch (error) {
      expect(error).toBeInstanceOf(UnauthorizedException);
      const responseBody = (error as UnauthorizedException).getResponse();
      expect(responseBody).toMatchObject({
        error: { code: 'INTERNAL_AUTH_INVALID' },
      });
      expect(responseBody).not.toHaveProperty('data');
    }
  });

  it('rejects a bearer token signed with a different secret with 401 at the auth guard', () => {
    process.env.HANDRIX_INTERNAL_AUTH_SECRET = 'a-different-server-secret';
    const attackerAuthService = new AuthService();
    const forgedSession = attackerAuthService.createInternalSession({
      email: 'support@handrix.local',
      password: 'support-demo-pass',
    });

    process.env.HANDRIX_INTERNAL_AUTH_SECRET = 'test-internal-auth-secret';
    const guard = new InternalAuthGuard();

    try {
      guard.canActivate(
        createHttpExecutionContext({
          headers: {
            authorization: `Bearer ${forgedSession!.accessToken}`,
          },
        }),
      );
      throw new Error(
        'Expected the auth guard to reject a mis-signed bearer token.',
      );
    } catch (error) {
      expect(error).toBeInstanceOf(UnauthorizedException);
      expect((error as UnauthorizedException).getResponse()).toMatchObject({
        error: { code: 'INTERNAL_AUTH_INVALID' },
      });
    }
  });

  it('rejects support-role tokens from reaching ops-only routes with 403 (role-isolation regression)', () => {
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
      throw new Error(
        'Expected the role guard to reject a support user on ops routes.',
      );
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenException);
      const responseBody = (error as ForbiddenException).getResponse();
      expect(responseBody).toMatchObject({
        error: {
          code: 'INTERNAL_AUTH_FORBIDDEN',
        },
      });
      expect(responseBody).not.toHaveProperty('data');
      expect(responseBody).not.toHaveProperty('publicId');
      expect(responseBody).not.toHaveProperty('request');
      expect(JSON.stringify(responseBody)).not.toContain('hrx_');
    }
  });
});
