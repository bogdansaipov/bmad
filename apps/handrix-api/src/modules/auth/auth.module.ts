import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { InternalUserSyncService } from './internal-user-sync.service';
import { InternalAuthGuard } from './internal-auth.guard';
import { InternalRolesGuard } from './internal-roles.guard';

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    InternalUserSyncService,
    InternalAuthGuard,
    InternalRolesGuard,
  ],
  exports: [AuthService, InternalAuthGuard, InternalRolesGuard],
})
export class AuthModule {}
