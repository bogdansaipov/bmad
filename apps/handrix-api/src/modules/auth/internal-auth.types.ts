import type { Request } from 'express';
import type { InternalUserRole } from '@handrix/shared-contracts';

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
  user?: AuthenticatedInternalUser;
};
