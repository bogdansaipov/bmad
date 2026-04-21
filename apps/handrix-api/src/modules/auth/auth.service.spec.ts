import { AuthService } from './auth.service';
import { validateInternalAccessToken } from './internal-auth-token';

describe('AuthService', () => {
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

  it('issues a signed internal session for a valid ops user', () => {
    const service = new AuthService();
    const session = service.createInternalSession({
      email: 'ops@handrix.local',
      password: 'ops-demo-pass',
    });

    expect(session).not.toBeNull();
    expect(session?.tokenType).toBe('Bearer');
    expect(session?.user.role).toBe('ops');

    const validatedUser = validateInternalAccessToken({
      token: session!.accessToken,
      secret: 'test-internal-auth-secret',
      issuer: 'handrix-test-suite',
    });

    expect(validatedUser).toEqual({
      id: 'ops-default-user',
      email: 'ops@handrix.local',
      displayName: 'Operations Coordinator',
      role: 'ops',
    });
  });

  it('rejects invalid credentials', () => {
    const service = new AuthService();

    expect(
      service.createInternalSession({
        email: 'ops@handrix.local',
        password: 'wrong-password',
      }),
    ).toBeNull();
  });
});
