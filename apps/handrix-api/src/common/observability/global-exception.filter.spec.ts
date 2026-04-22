import type { ArgumentsHost } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { createErrorResponse } from '@handrix/shared-contracts';
import { AppLogger } from './app-logger';
import { GlobalExceptionFilter } from './global-exception.filter';

describe('GlobalExceptionFilter', () => {
  it('preserves the existing error envelope and correlation id header', () => {
    const loggerFailure = jest.fn();
    const logger = {
      failure: loggerFailure,
    } as unknown as AppLogger;
    const filter = new GlobalExceptionFilter(logger);
    const request = {
      method: 'POST',
      originalUrl: '/requests',
      url: '/requests',
      routeScope: 'requests',
      correlationId: 'corr_test_123',
      params: {},
      body: {},
      headers: {},
    };
    const response = {
      headersSent: false,
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const host = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as ArgumentsHost;
    const exception = new BadRequestException(
      createErrorResponse({
        code: 'REQUEST_VALIDATION_FAILED',
        message: 'We could not confirm this request yet.',
        recoveryHint: 'Please review the request details and try again.',
      }),
    );

    filter.catch(exception, host);

    expect(response.setHeader).toHaveBeenCalledWith(
      'x-correlation-id',
      'corr_test_123',
    );
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith(
      createErrorResponse({
        code: 'REQUEST_VALIDATION_FAILED',
        message: 'We could not confirm this request yet.',
        recoveryHint: 'Please review the request details and try again.',
      }),
    );
    expect(loggerFailure).toHaveBeenCalledWith(
      'http.request.failed',
      expect.objectContaining({
        correlationId: 'corr_test_123',
        errorCode: 'REQUEST_VALIDATION_FAILED',
        statusCode: 400,
      }),
    );
  });
});
