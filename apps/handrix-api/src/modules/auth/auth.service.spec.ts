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

  it('issues a signed internal session for a valid support user', () => {
    const service = new AuthService();
    const session = service.createInternalSession({
      email: 'support@handrix.local',
      password: 'support-demo-pass',
    });

    expect(session).not.toBeNull();
    expect(session?.tokenType).toBe('Bearer');
    expect(session?.user.role).toBe('support');

    const validatedUser = validateInternalAccessToken({
      token: session!.accessToken,
      secret: 'test-internal-auth-secret',
      issuer: 'handrix-test-suite',
    });

    expect(validatedUser).toEqual({
      id: 'support-default-user',
      email: 'support@handrix.local',
      displayName: 'Support Coordinator',
      role: 'support',
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

  it('rejects a support login with a wrong password and leaks no user data', () => {
    const service = new AuthService();

    const result = service.createInternalSession({
      email: 'support@handrix.local',
      password: 'definitely-not-the-support-password',
    });

    expect(result).toBeNull();
  });

  it('rejects a support login with an unknown email and leaks no user data', () => {
    const service = new AuthService();

    const result = service.createInternalSession({
      email: 'ghost@handrix.local',
      password: 'support-demo-pass',
    });

    expect(result).toBeNull();
  });

  it('rejects production fallback secrets during auth config loading', () => {
    process.env = {
      ...originalEnv,
      HANDRIX_ENV: 'production',
      HANDRIX_API_CORS_ORIGIN: 'https://app.handrix.example',
      HANDRIX_DATABASE_URL:
        'postgresql://handrix:secure-pass@db.handrix.example:5432/handrix?schema=public',
      HANDRIX_INTERNAL_AUTH_ISSUER: 'handrix-production',
      HANDRIX_INTERNAL_AUTH_SECRET: 'handrix-local-internal-auth-secret',
      HANDRIX_REQUEST_TOKEN_SECRET: 'prod-request-token-secret',
      HANDRIX_OPS_EMAIL: 'ops@handrix.local',
      HANDRIX_OPS_PASSWORD: 'ops-prod-pass',
      HANDRIX_SUPPORT_EMAIL: 'support@handrix.local',
      HANDRIX_SUPPORT_PASSWORD: 'support-prod-pass',
    };

    expect(() =>
      new AuthService().createInternalSession({
        email: 'ops@handrix.local',
        password: 'ops-prod-pass',
      }),
    ).toThrow(
      'HANDRIX_INTERNAL_AUTH_SECRET must not use the local development fallback.',
    );
  });
});
