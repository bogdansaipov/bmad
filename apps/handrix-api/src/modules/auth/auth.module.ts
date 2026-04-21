import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { InternalAuthGuard } from './internal-auth.guard';
import { InternalRolesGuard } from './internal-roles.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, InternalAuthGuard, InternalRolesGuard],
  exports: [AuthService, InternalAuthGuard, InternalRolesGuard],
})
export class AuthModule {}
