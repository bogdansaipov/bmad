import { randomUUID } from 'node:crypto';
import type { NextFunction, Response } from 'express';
import { Injectable, NestMiddleware } from '@nestjs/common';
import type { AuthenticatedInternalRequest } from '../../modules/auth/internal-auth.types';
import { AppLogger } from './app-logger';
import {
  correlationIdHeaderName,
  inferActorType,
  inferRouteScope,
  resolvePublicIdCandidate,
} from './observability.helpers';
import { runWithRequestContext } from './request-context';

function getHeaderValue(header: string | string[] | undefined) {
  if (Array.isArray(header)) {
    return header[0];
  }

  return header;
}

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private readonly appLogger: AppLogger) {}

  use(
    request: AuthenticatedInternalRequest,
    response: Response,
    next: NextFunction,
  ) {
    const inboundCorrelationId =
      getHeaderValue(request.headers[correlationIdHeaderName]) ??
      getHeaderValue(request.headers['x-request-id']);
    const correlationId = inboundCorrelationId?.trim() || randomUUID();
    const routeScope = inferRouteScope(request.originalUrl ?? request.url);
    const actorType = inferActorType(request);
    const startedAt = Date.now();

    request.correlationId = correlationId;
    request.routeScope = routeScope;
    response.setHeader(correlationIdHeaderName, correlationId);

    runWithRequestContext(
      {
        correlationId,
        method: request.method,
        path: request.originalUrl ?? request.url,
        routeScope,
        actorType,
        startedAt,
      },
      () => {
        response.once('finish', () => {
          this.appLogger.info('http.request.completed', {
            correlationId,
            method: request.method,
            path: request.originalUrl ?? request.url,
            routeScope,
            actorType: inferActorType(request),
            actorId: request.user?.id,
            publicId: resolvePublicIdCandidate(request),
            statusCode: response.statusCode,
            durationMs: Date.now() - startedAt,
          });
        });

        next();
      },
    );
  }
}
