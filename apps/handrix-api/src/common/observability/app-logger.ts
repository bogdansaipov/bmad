import pino, { type Logger } from 'pino';
import { Injectable, LoggerService, Optional } from '@nestjs/common';
import { parseAppEnv } from '../../config/env.validation';

type LogMetadata = Record<string, unknown>;

function createLogger(): Logger {
  const env = parseAppEnv();
  const isTestEnvironment =
    env.nodeEnv === 'test' || process.env.JEST_WORKER_ID !== undefined;

  return pino({
    level: isTestEnvironment ? 'silent' : 'info',
    base: {
      service: 'handrix-api',
      environment: env.nodeEnv,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level(label) {
        return { level: label };
      },
    },
  });
}

@Injectable()
export class AppLogger implements LoggerService {
  private readonly logger: Logger;

  constructor(@Optional() logger?: Logger) {
    this.logger = logger ?? createLogger();
  }

  log(message: unknown, context?: string) {
    this.logger.info(this.toNestPayload(message, context));
  }

  error(message: unknown, trace?: string, context?: string) {
    this.logger.error(this.toNestPayload(message, context, trace));
  }

  warn(message: unknown, context?: string) {
    this.logger.warn(this.toNestPayload(message, context));
  }

  debug(message: unknown, context?: string) {
    this.logger.debug(this.toNestPayload(message, context));
  }

  verbose(message: unknown, context?: string) {
    this.logger.trace(this.toNestPayload(message, context));
  }

  info(event: string, metadata: LogMetadata = {}) {
    this.logger.info({ event, ...metadata }, event);
  }

  warning(event: string, metadata: LogMetadata = {}) {
    this.logger.warn({ event, ...metadata }, event);
  }

  failure(event: string, metadata: LogMetadata = {}) {
    this.logger.error({ event, ...metadata }, event);
  }

  private toNestPayload(message: unknown, context?: string, trace?: string) {
    const normalizedMessage =
      typeof message === 'string' ? message : JSON.stringify(message);

    return {
      message: normalizedMessage,
      ...(context ? { context } : {}),
      ...(trace ? { trace } : {}),
    };
  }
}
