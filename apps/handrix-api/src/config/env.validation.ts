type NodeEnv = 'development' | 'test' | 'staging' | 'production';
type InternalUserRole = 'ops' | 'support';

export type InternalStaffUserConfig = {
  id: string;
  email: string;
  password: string;
  displayName: string;
  role: InternalUserRole;
};

export type AppEnv = {
  corsOrigin: string | string[];
  databaseUrl: string;
  internalAuthIssuer: string;
  internalAuthSecret: string;
  internalAuthTtlMinutes: number;
  internalStaffUsers: InternalStaffUserConfig[];
  nodeEnv: NodeEnv;
  port: number;
  rateLimitDefaultLimit: number;
  rateLimitDefaultTtlMs: number;
  requestTokenSecret: string;
  trustProxy: boolean;
};

function parsePort(rawPort: string | undefined): number {
  if (!rawPort) {
    return 3000;
  }

  const port = Number(rawPort);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid HANDRIX_API_PORT value: ${rawPort}`);
  }

  return port;
}

function parseNodeEnv(rawNodeEnv: string | undefined): NodeEnv {
  const nodeEnv = rawNodeEnv ?? 'development';

  if (
    nodeEnv === 'development' ||
    nodeEnv === 'test' ||
    nodeEnv === 'staging' ||
    nodeEnv === 'production'
  ) {
    return nodeEnv;
  }

  throw new Error(`Invalid HANDRIX_ENV value: ${nodeEnv}`);
}

function isDeployedEnv(nodeEnv: NodeEnv) {
  return nodeEnv === 'staging' || nodeEnv === 'production';
}

function parsePositiveInteger(
  rawValue: string | undefined,
  fallback: number,
  label: string,
) {
  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number(rawValue);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`Invalid ${label} value: ${rawValue}`);
  }

  return parsedValue;
}

function parseBoolean(rawValue: string | undefined, fallback: boolean) {
  if (!rawValue) {
    return fallback;
  }

  const normalizedValue = rawValue.trim().toLowerCase();

  if (['true', '1', 'yes', 'on'].includes(normalizedValue)) {
    return true;
  }

  if (['false', '0', 'no', 'off'].includes(normalizedValue)) {
    return false;
  }

  throw new Error(`Invalid boolean value: ${rawValue}`);
}

function normalizeUrl(value: string, label: string) {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(value);
  } catch {
    throw new Error(`Invalid ${label} value: ${value}`);
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error(`Invalid ${label} value: ${value}`);
  }

  return parsedUrl;
}

function parseCorsOrigins(rawValue: string | undefined, nodeEnv: NodeEnv) {
  const normalizedOrigins = (rawValue ?? 'http://localhost:5173')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  if (normalizedOrigins.length === 0) {
    throw new Error(
      'HANDRIX_API_CORS_ORIGIN must include at least one origin.',
    );
  }

  const parsedOrigins = normalizedOrigins.map((origin) =>
    normalizeUrl(origin, 'HANDRIX_API_CORS_ORIGIN'),
  );

  if (
    isDeployedEnv(nodeEnv) &&
    parsedOrigins.some((origin) => origin.hostname === 'localhost')
  ) {
    throw new Error(
      'HANDRIX_API_CORS_ORIGIN must not use localhost origins in production.',
    );
  }

  return normalizedOrigins.length === 1
    ? normalizedOrigins[0]
    : normalizedOrigins;
}

function parseRequiredValue(
  rawValue: string | undefined,
  fallback: string,
  label: string,
  nodeEnv: NodeEnv,
) {
  const trimmedValue = rawValue?.trim();

  if (trimmedValue) {
    return trimmedValue;
  }

  if (isDeployedEnv(nodeEnv)) {
    throw new Error(`Missing required ${label} value.`);
  }

  return fallback;
}

function parseRequiredSecretValue(
  rawValue: string | undefined,
  fallback: string,
  label: string,
  nodeEnv: NodeEnv,
) {
  const parsedValue = parseRequiredValue(rawValue, fallback, label, nodeEnv);

  if (isDeployedEnv(nodeEnv) && parsedValue === fallback) {
    throw new Error(`${label} must not use the local development fallback.`);
  }

  return parsedValue;
}

function parseInternalStaffUser(input: {
  nodeEnv: NodeEnv;
  role: InternalUserRole;
  defaultDisplayName: string;
  defaultEmail: string;
  defaultPassword: string;
  displayName: string | undefined;
  email: string | undefined;
  password: string | undefined;
}): InternalStaffUserConfig {
  const displayName = parseRequiredValue(
    input.displayName,
    input.defaultDisplayName,
    `HANDRIX_${input.role.toUpperCase()}_DISPLAY_NAME`,
    input.nodeEnv,
  );
  const email = parseRequiredValue(
    input.email,
    input.defaultEmail,
    `HANDRIX_${input.role.toUpperCase()}_EMAIL`,
    input.nodeEnv,
  ).toLowerCase();
  const password = parseRequiredValue(
    input.password,
    input.defaultPassword,
    `HANDRIX_${input.role.toUpperCase()}_PASSWORD`,
    input.nodeEnv,
  );

  if (!email.includes('@')) {
    throw new Error(
      `Invalid HANDRIX_${input.role.toUpperCase()}_EMAIL value: ${email}`,
    );
  }

  if (password.length < 8) {
    throw new Error(
      `Invalid HANDRIX_${input.role.toUpperCase()}_PASSWORD value.`,
    );
  }

  if (isDeployedEnv(input.nodeEnv) && password === input.defaultPassword) {
    throw new Error(
      `HANDRIX_${input.role.toUpperCase()}_PASSWORD must not use the local development fallback.`,
    );
  }

  return {
    id: `${input.role}-default-user`,
    email,
    password,
    displayName,
    role: input.role,
  };
}

export function parseAppEnv(env: NodeJS.ProcessEnv = process.env): AppEnv {
  const nodeEnv = parseNodeEnv(env.HANDRIX_ENV);

  return {
    corsOrigin: parseCorsOrigins(env.HANDRIX_API_CORS_ORIGIN, nodeEnv),
    databaseUrl: parseRequiredValue(
      env.HANDRIX_DATABASE_URL,
      'postgresql://handrix:handrix@localhost:5432/handrix?schema=public',
      'HANDRIX_DATABASE_URL',
      nodeEnv,
    ),
    internalAuthIssuer: parseRequiredValue(
      env.HANDRIX_INTERNAL_AUTH_ISSUER,
      'handrix-api',
      'HANDRIX_INTERNAL_AUTH_ISSUER',
      nodeEnv,
    ),
    internalAuthSecret: parseRequiredSecretValue(
      env.HANDRIX_INTERNAL_AUTH_SECRET,
      'handrix-local-internal-auth-secret',
      'HANDRIX_INTERNAL_AUTH_SECRET',
      nodeEnv,
    ),
    internalAuthTtlMinutes: parsePositiveInteger(
      env.HANDRIX_INTERNAL_AUTH_TTL_MINUTES,
      480,
      'HANDRIX_INTERNAL_AUTH_TTL_MINUTES',
    ),
    internalStaffUsers: [
      parseInternalStaffUser({
        nodeEnv,
        role: 'ops',
        defaultDisplayName: 'Operations Coordinator',
        defaultEmail: 'ops@handrix.local',
        defaultPassword: 'ops-demo-pass',
        displayName: env.HANDRIX_OPS_DISPLAY_NAME,
        email: env.HANDRIX_OPS_EMAIL,
        password: env.HANDRIX_OPS_PASSWORD,
      }),
      parseInternalStaffUser({
        nodeEnv,
        role: 'support',
        defaultDisplayName: 'Support Coordinator',
        defaultEmail: 'support@handrix.local',
        defaultPassword: 'support-demo-pass',
        displayName: env.HANDRIX_SUPPORT_DISPLAY_NAME,
        email: env.HANDRIX_SUPPORT_EMAIL,
        password: env.HANDRIX_SUPPORT_PASSWORD,
      }),
    ],
    nodeEnv,
    port: parsePort(env.HANDRIX_API_PORT),
    rateLimitDefaultLimit: parsePositiveInteger(
      env.HANDRIX_RATE_LIMIT_DEFAULT_LIMIT,
      120,
      'HANDRIX_RATE_LIMIT_DEFAULT_LIMIT',
    ),
    rateLimitDefaultTtlMs: parsePositiveInteger(
      env.HANDRIX_RATE_LIMIT_DEFAULT_TTL_MS,
      60000,
      'HANDRIX_RATE_LIMIT_DEFAULT_TTL_MS',
    ),
    requestTokenSecret: parseRequiredSecretValue(
      env.HANDRIX_REQUEST_TOKEN_SECRET,
      'handrix-local-tracking-secret',
      'HANDRIX_REQUEST_TOKEN_SECRET',
      nodeEnv,
    ),
    trustProxy: parseBoolean(env.HANDRIX_TRUST_PROXY, false),
  };
}
