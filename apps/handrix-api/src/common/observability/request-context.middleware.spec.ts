import type { NextFunction, Response } from 'express';
import { AppLogger } from './app-logger';
import { correlationIdHeaderName } from './observability.helpers';
import { RequestContextMiddleware } from './request-context.middleware';
import { getRequestContext } from './request-context';

describe('RequestContextMiddleware', () => {
  it('assigns a correlation id, exposes request context, and logs the completed request', () => {
    const loggerInfo = jest.fn<void, [string, Record<string, unknown>]>();
    const logger = {
      info: loggerInfo,
    } as unknown as AppLogger;
    const middleware = new RequestContextMiddleware(logger);
    const request = {
      headers: {},
      method: 'GET',
      originalUrl: '/requests/status-lookups',
      url: '/requests/status-lookups',
      params: {},
      body: { publicId: 'hrx_test_123' },
    } as const;
    let finishHandler: (() => void) | undefined;
    const setHeader = jest.fn();
    const response = {
      statusCode: 200,
      setHeader,
      once: jest.fn((event: string, callback: () => void) => {
        if (event === 'finish') {
          finishHandler = callback;
        }

        return response;
      }),
    } as unknown as Response;
    let nextCallCount = 0;
    const next: NextFunction = () => {
      nextCallCount += 1;
      expect(getRequestContext()?.routeScope).toBe('requests');
      expect(getRequestContext()?.actorType).toBe('customer');
      expect(getRequestContext()?.correlationId).toBeDefined();
    };

    middleware.use(request as never, response, next);

    expect(setHeader).toHaveBeenCalledWith(
      correlationIdHeaderName,
      expect.any(String),
    );
    expect(nextCallCount).toBe(1);

    expect(finishHandler).toBeDefined();
    finishHandler?.();

    expect(loggerInfo).toHaveBeenCalled();

    const loggerCall = loggerInfo.mock.calls[0];

    expect(loggerCall).toBeDefined();

    if (!loggerCall) {
      throw new Error('Expected the request completion log to be emitted.');
    }

    const [eventName, metadata] = loggerCall;

    expect(eventName).toBe('http.request.completed');
    expect(metadata.routeScope).toBe('requests');
    expect(metadata.actorType).toBe('customer');
    expect(metadata.publicId).toBe('hrx_test_123');
    expect(metadata.statusCode).toBe(200);
    expect(typeof metadata.correlationId).toBe('string');
    expect(metadata).not.toHaveProperty('authorization');
    expect(metadata).not.toHaveProperty('trackingToken');
  });
});
