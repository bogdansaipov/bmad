import type { ExecutionContext } from '@nestjs/common';

export function createHttpExecutionContext(
  request: {
    headers?: Record<string, string>;
    user?: unknown;
  },
  options: {
    handler?: unknown;
    classRef?: unknown;
  } = {},
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => options.handler ?? (() => undefined),
    getClass: () => options.classRef ?? (() => undefined),
  } as unknown as ExecutionContext;
}
