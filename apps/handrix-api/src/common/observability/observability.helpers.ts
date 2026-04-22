import type { Request } from 'express';
import type { AuthenticatedInternalRequest } from '../../modules/auth/internal-auth.types';
import type { RequestActorType, RouteScope } from './request-context';

export const correlationIdHeaderName = 'x-correlation-id';

export function inferRouteScope(path: string | undefined): RouteScope {
  if (!path) {
    return 'system';
  }

  if (path.startsWith('/requests')) {
    return 'requests';
  }

  if (path.startsWith('/ops')) {
    return 'ops';
  }

  if (path.startsWith('/support')) {
    return 'support';
  }

  if (path.startsWith('/auth')) {
    return 'auth';
  }

  if (path.startsWith('/health')) {
    return 'health';
  }

  if (path.startsWith('/reference-data')) {
    return 'reference-data';
  }

  return 'system';
}

export function inferActorType(
  request: Pick<AuthenticatedInternalRequest, 'user'> &
    Pick<Request, 'originalUrl' | 'url'>,
): RequestActorType {
  if (request.user?.role === 'ops') {
    return 'ops';
  }

  if (request.user?.role === 'support') {
    return 'support';
  }

  const routeScope = inferRouteScope(request.originalUrl ?? request.url);

  if (routeScope === 'requests') {
    return 'customer';
  }

  return 'system';
}

export function resolvePublicIdCandidate(
  request: Pick<Request, 'params'> & { body?: unknown },
) {
  const paramPublicId = request.params?.publicId;

  if (typeof paramPublicId === 'string' && paramPublicId.trim().length > 0) {
    return paramPublicId;
  }

  if (
    typeof request.body === 'object' &&
    request.body !== null &&
    'publicId' in request.body
  ) {
    const bodyPublicId = (request.body as { publicId?: unknown }).publicId;

    if (typeof bodyPublicId === 'string' && bodyPublicId.trim().length > 0) {
      return bodyPublicId;
    }
  }

  return undefined;
}
