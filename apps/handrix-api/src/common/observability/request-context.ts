import { randomUUID } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';

export type RequestActorType = 'customer' | 'ops' | 'support' | 'system';
export type RouteScope =
  | 'requests'
  | 'ops'
  | 'support'
  | 'auth'
  | 'health'
  | 'reference-data'
  | 'system';

export type RequestContextValue = {
  correlationId: string;
  method: string;
  path: string;
  routeScope: RouteScope;
  actorType: RequestActorType;
  startedAt: number;
  actorId?: string;
  publicId?: string;
};

const requestContextStorage = new AsyncLocalStorage<RequestContextValue>();

export function runWithRequestContext<T>(
  value: RequestContextValue,
  callback: () => T,
) {
  return requestContextStorage.run(value, callback);
}

export function getRequestContext() {
  return requestContextStorage.getStore();
}

export function updateRequestContext(
  updates: Partial<
    Pick<RequestContextValue, 'actorId' | 'actorType' | 'publicId'>
  >,
) {
  const context = requestContextStorage.getStore();

  if (!context) {
    return;
  }

  Object.assign(context, updates);
}

export function getCurrentCorrelationId() {
  return requestContextStorage.getStore()?.correlationId ?? randomUUID();
}
