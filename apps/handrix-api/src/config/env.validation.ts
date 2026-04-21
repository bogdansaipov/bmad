type NodeEnv = 'development' | 'test' | 'production';
type InternalUserRole = 'ops' | 'support';

export type InternalStaffUserConfig = {
  id: string;
  email: string;
  password: string;
  displayName: string;
  role: InternalUserRole;
};

export type AppEnv = {
  corsOrigin: string;
  internalAuthIssuer: string;
  internalAuthSecret: string;
  internalAuthTtlMinutes: number;
  internalStaffUsers: InternalStaffUserConfig[];
  nodeEnv: NodeEnv;
  port: number;
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
    nodeEnv === 'production'
  ) {
    return nodeEnv;
  }

  throw new Error(`Invalid HANDRIX_ENV value: ${nodeEnv}`);
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

  if (nodeEnv === 'production') {
    throw new Error(`Missing required ${label} value.`);
  }

  return fallback;
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
    corsOrigin: env.HANDRIX_API_CORS_ORIGIN?.trim() || 'http://localhost:5173',
    internalAuthIssuer:
      env.HANDRIX_INTERNAL_AUTH_ISSUER?.trim() || 'handrix-api',
    internalAuthSecret: parseRequiredValue(
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
  };
}
