import type { InternalUserRole } from '@handrix/shared-contracts';
import { SetMetadata } from '@nestjs/common';

export const INTERNAL_ROLES_KEY = 'internalRoles';

export const InternalRoles = (...roles: InternalUserRole[]) =>
  SetMetadata(INTERNAL_ROLES_KEY, roles);
