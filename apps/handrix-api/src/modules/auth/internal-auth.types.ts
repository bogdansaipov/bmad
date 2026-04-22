import type { Request } from 'express';
import type { InternalUserRole } from '@handrix/shared-contracts';
import type { RouteScope } from '../../common/observability/request-context';

export type InternalStaffUser = {
  id: string;
  email: string;
  password: string;
  displayName: string;
  role: InternalUserRole;
};

export type AuthenticatedInternalUser = {
  id: string;
  email: string;
  displayName: string;
  role: InternalUserRole;
};

export type AuthenticatedInternalRequest = Request & {
  correlationId?: string;
  routeScope?: RouteScope;
  user?: AuthenticatedInternalUser;
};
