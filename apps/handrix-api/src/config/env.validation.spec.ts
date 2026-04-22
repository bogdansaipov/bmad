import { parseAppEnv } from './env.validation';

describe('parseAppEnv', () => {
  it('parses security defaults and comma-separated CORS origins for local use', () => {
    const env = parseAppEnv({
      HANDRIX_ENV: 'development',
      HANDRIX_API_CORS_ORIGIN:
        'http://localhost:5173, https://staging.handrix.test',
      HANDRIX_DATABASE_URL:
        'postgresql://handrix:handrix@localhost:5432/handrix?schema=public',
      HANDRIX_INTERNAL_AUTH_SECRET: 'local-secret-value',
      HANDRIX_REQUEST_TOKEN_SECRET: 'local-request-secret',
      HANDRIX_OPS_EMAIL: 'ops@handrix.local',
      HANDRIX_OPS_PASSWORD: 'ops-demo-pass',
      HANDRIX_SUPPORT_EMAIL: 'support@handrix.local',
      HANDRIX_SUPPORT_PASSWORD: 'support-demo-pass',
      HANDRIX_TRUST_PROXY: 'true',
    });

    expect(env.corsOrigin).toEqual([
      'http://localhost:5173',
      'https://staging.handrix.test',
    ]);
    expect(env.trustProxy).toBe(true);
    expect(env.rateLimitDefaultLimit).toBe(120);
    expect(env.rateLimitDefaultTtlMs).toBe(60000);
  });

  it('parses staging as a deployed environment', () => {
    const env = parseAppEnv({
      HANDRIX_ENV: 'staging',
      HANDRIX_API_CORS_ORIGIN: 'https://web.staging.handrix.test',
      HANDRIX_DATABASE_URL:
        'postgresql://handrix:handrix@db:5432/handrix?schema=public',
      HANDRIX_INTERNAL_AUTH_ISSUER: 'handrix-api-staging',
      HANDRIX_INTERNAL_AUTH_SECRET: 'staging-internal-secret',
      HANDRIX_REQUEST_TOKEN_SECRET: 'staging-request-secret',
      HANDRIX_OPS_DISPLAY_NAME: 'Ops Staging',
      HANDRIX_OPS_EMAIL: 'ops@handrix.test',
      HANDRIX_OPS_PASSWORD: 'ops-staging-pass',
      HANDRIX_SUPPORT_DISPLAY_NAME: 'Support Staging',
      HANDRIX_SUPPORT_EMAIL: 'support@handrix.test',
      HANDRIX_SUPPORT_PASSWORD: 'support-staging-pass',
    });

    expect(env.nodeEnv).toBe('staging');
    expect(env.corsOrigin).toBe('https://web.staging.handrix.test');
  });

  it('rejects production internal auth fallback secrets', () => {
    expect(() =>
      parseAppEnv({
        HANDRIX_ENV: 'production',
        HANDRIX_API_CORS_ORIGIN: 'https://app.handrix.test',
        HANDRIX_DATABASE_URL:
          'postgresql://handrix:handrix@db:5432/handrix?schema=public',
        HANDRIX_INTERNAL_AUTH_ISSUER: 'handrix-api',
        HANDRIX_INTERNAL_AUTH_SECRET: 'handrix-local-internal-auth-secret',
        HANDRIX_REQUEST_TOKEN_SECRET: 'request-secret',
        HANDRIX_OPS_DISPLAY_NAME: 'Ops Prod',
        HANDRIX_OPS_EMAIL: 'ops@handrix.local',
        HANDRIX_OPS_PASSWORD: 'ops-prod-pass',
        HANDRIX_SUPPORT_DISPLAY_NAME: 'Support Prod',
        HANDRIX_SUPPORT_EMAIL: 'support@handrix.local',
        HANDRIX_SUPPORT_PASSWORD: 'support-prod-pass',
      }),
    ).toThrow(
      'HANDRIX_INTERNAL_AUTH_SECRET must not use the local development fallback.',
    );
  });

  it('rejects production request token fallback secrets', () => {
    expect(() =>
      parseAppEnv({
        HANDRIX_ENV: 'production',
        HANDRIX_API_CORS_ORIGIN: 'https://app.handrix.test',
        HANDRIX_DATABASE_URL:
          'postgresql://handrix:handrix@db:5432/handrix?schema=public',
        HANDRIX_INTERNAL_AUTH_ISSUER: 'handrix-api',
        HANDRIX_INTERNAL_AUTH_SECRET: 'prod-internal-secret',
        HANDRIX_REQUEST_TOKEN_SECRET: 'handrix-local-tracking-secret',
        HANDRIX_OPS_DISPLAY_NAME: 'Ops Prod',
        HANDRIX_OPS_EMAIL: 'ops@handrix.local',
        HANDRIX_OPS_PASSWORD: 'ops-prod-pass',
        HANDRIX_SUPPORT_DISPLAY_NAME: 'Support Prod',
        HANDRIX_SUPPORT_EMAIL: 'support@handrix.local',
        HANDRIX_SUPPORT_PASSWORD: 'support-prod-pass',
      }),
    ).toThrow(
      'HANDRIX_REQUEST_TOKEN_SECRET must not use the local development fallback.',
    );
  });

  it('rejects production default staff passwords', () => {
    expect(() =>
      parseAppEnv({
        HANDRIX_ENV: 'production',
        HANDRIX_API_CORS_ORIGIN: 'https://app.handrix.test',
        HANDRIX_DATABASE_URL:
          'postgresql://handrix:handrix@db:5432/handrix?schema=public',
        HANDRIX_INTERNAL_AUTH_ISSUER: 'handrix-api',
        HANDRIX_INTERNAL_AUTH_SECRET: 'prod-internal-secret',
        HANDRIX_REQUEST_TOKEN_SECRET: 'prod-request-secret',
        HANDRIX_OPS_DISPLAY_NAME: 'Ops Prod',
        HANDRIX_OPS_EMAIL: 'ops@handrix.local',
        HANDRIX_OPS_PASSWORD: 'ops-demo-pass',
        HANDRIX_SUPPORT_DISPLAY_NAME: 'Support Prod',
        HANDRIX_SUPPORT_EMAIL: 'support@handrix.local',
        HANDRIX_SUPPORT_PASSWORD: 'support-prod-pass',
      }),
    ).toThrow(
      'HANDRIX_OPS_PASSWORD must not use the local development fallback.',
    );
  });

  it('rejects malformed API CORS origins', () => {
    expect(() =>
      parseAppEnv({
        HANDRIX_ENV: 'development',
        HANDRIX_API_CORS_ORIGIN: 'not-a-url',
        HANDRIX_DATABASE_URL:
          'postgresql://handrix:handrix@localhost:5432/handrix?schema=public',
        HANDRIX_INTERNAL_AUTH_SECRET: 'local-secret-value',
        HANDRIX_REQUEST_TOKEN_SECRET: 'local-request-secret',
        HANDRIX_OPS_EMAIL: 'ops@handrix.local',
        HANDRIX_OPS_PASSWORD: 'ops-demo-pass',
        HANDRIX_SUPPORT_EMAIL: 'support@handrix.local',
        HANDRIX_SUPPORT_PASSWORD: 'support-demo-pass',
      }),
    ).toThrow('Invalid HANDRIX_API_CORS_ORIGIN value: not-a-url');
  });

  it('rejects localhost CORS origins in production', () => {
    expect(() =>
      parseAppEnv({
        HANDRIX_ENV: 'production',
        HANDRIX_API_CORS_ORIGIN: 'http://localhost:5173',
        HANDRIX_DATABASE_URL:
          'postgresql://handrix:handrix@db:5432/handrix?schema=public',
        HANDRIX_INTERNAL_AUTH_SECRET: 'prod-internal-secret',
        HANDRIX_REQUEST_TOKEN_SECRET: 'prod-request-secret',
        HANDRIX_OPS_DISPLAY_NAME: 'Ops Prod',
        HANDRIX_OPS_EMAIL: 'ops@handrix.local',
        HANDRIX_OPS_PASSWORD: 'ops-prod-pass',
        HANDRIX_SUPPORT_DISPLAY_NAME: 'Support Prod',
        HANDRIX_SUPPORT_EMAIL: 'support@handrix.local',
        HANDRIX_SUPPORT_PASSWORD: 'support-prod-pass',
      }),
    ).toThrow(
      'HANDRIX_API_CORS_ORIGIN must not use localhost origins in production.',
    );
  });

  it('rejects blank internal auth issuers in production', () => {
    expect(() =>
      parseAppEnv({
        HANDRIX_ENV: 'production',
        HANDRIX_API_CORS_ORIGIN: 'https://app.handrix.test',
        HANDRIX_DATABASE_URL:
          'postgresql://handrix:handrix@db:5432/handrix?schema=public',
        HANDRIX_INTERNAL_AUTH_SECRET: 'prod-internal-secret',
        HANDRIX_INTERNAL_AUTH_ISSUER: '   ',
        HANDRIX_REQUEST_TOKEN_SECRET: 'prod-request-secret',
        HANDRIX_OPS_DISPLAY_NAME: 'Ops Prod',
        HANDRIX_OPS_EMAIL: 'ops@handrix.local',
        HANDRIX_OPS_PASSWORD: 'ops-prod-pass',
        HANDRIX_SUPPORT_DISPLAY_NAME: 'Support Prod',
        HANDRIX_SUPPORT_EMAIL: 'support@handrix.local',
        HANDRIX_SUPPORT_PASSWORD: 'support-prod-pass',
      }),
    ).toThrow('Missing required HANDRIX_INTERNAL_AUTH_ISSUER value.');
  });
});
