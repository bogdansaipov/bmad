import { Injectable, OnModuleInit } from '@nestjs/common';
import { type InternalUserRole } from '@prisma/client';
import { parseAppEnv } from '../../config/env.validation';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InternalUserSyncService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    const env = parseAppEnv();
    const operations = env.internalStaffUsers.map((user) =>
      this.prisma.internalUser.upsert({
        where: {
          email: user.email,
        },
        update: {
          id: user.id,
          displayName: user.displayName,
          role: user.role as InternalUserRole,
          source: 'env_seeded',
        },
        create: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          role: user.role as InternalUserRole,
          source: 'env_seeded',
        },
      }),
    );

    await Promise.all(operations);
  }
}
