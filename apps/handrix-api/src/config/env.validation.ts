type NodeEnv = 'development' | 'test' | 'production';

export type AppEnv = {
  corsOrigin: string;
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

export function parseAppEnv(env: NodeJS.ProcessEnv = process.env): AppEnv {
  return {
    corsOrigin: env.HANDRIX_API_CORS_ORIGIN?.trim() || 'http://localhost:5173',
    nodeEnv: parseNodeEnv(env.HANDRIX_ENV),
    port: parsePort(env.HANDRIX_API_PORT),
  };
}
