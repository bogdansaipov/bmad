import type { Response } from 'express';
import { createErrorResponse } from '@handrix/shared-contracts';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import type { AuthenticatedInternalRequest } from '../../modules/auth/internal-auth.types';
import { AppLogger } from './app-logger';
import {
  correlationIdHeaderName,
  inferActorType,
  resolvePublicIdCandidate,
} from './observability.helpers';
import { getCurrentCorrelationId } from './request-context';

type ErrorEnvelope = ReturnType<typeof createErrorResponse>;

function isErrorEnvelope(value: unknown): value is ErrorEnvelope {
  return (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    typeof (value as { error?: unknown }).error === 'object'
  );
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly appLogger: AppLogger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const request = http.getRequest<AuthenticatedInternalRequest>();
    const response = http.getResponse<Response>();
    const correlationId = request.correlationId ?? getCurrentCorrelationId();
    const publicId = resolvePublicIdCandidate(request);
    const actorType = inferActorType(request);
    const actorId = request.user?.id;

    if (response.headersSent) {
      return;
    }

    let statusCode = 500;
    let payload: ErrorEnvelope = createErrorResponse({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'We could not complete that request right now.',
      recoveryHint: 'Please try again in a moment.',
    });

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (isErrorEnvelope(exceptionResponse)) {
        payload = exceptionResponse;
      } else if (typeof exceptionResponse === 'string') {
        payload = createErrorResponse({
          code: exception.name,
          message: exceptionResponse,
        });
      }
    }

    response.setHeader(correlationIdHeaderName, correlationId);

    this.appLogger.failure('http.request.failed', {
      correlationId,
      method: request.method,
      path: request.originalUrl ?? request.url,
      routeScope: request.routeScope,
      actorType,
      actorId,
      publicId,
      statusCode,
      errorName: exception instanceof Error ? exception.name : 'UnknownError',
      errorMessage:
        exception instanceof Error
          ? exception.message
          : 'Unknown request failure.',
      errorCode: payload.error.code,
      stack: exception instanceof Error ? exception.stack : undefined,
    });

    response.status(statusCode).json(payload);
  }
}
