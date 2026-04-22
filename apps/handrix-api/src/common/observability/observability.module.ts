import { Global, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { PrismaModule } from '../../prisma/prisma.module';
import { AppLogger } from './app-logger';
import { GlobalExceptionFilter } from './global-exception.filter';
import { ObservabilityService } from './observability.service';
import { RequestContextMiddleware } from './request-context.middleware';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    AppLogger,
    ObservabilityService,
    RequestContextMiddleware,
    GlobalExceptionFilter,
    {
      provide: APP_FILTER,
      useExisting: GlobalExceptionFilter,
    },
  ],
  exports: [
    AppLogger,
    ObservabilityService,
    RequestContextMiddleware,
    GlobalExceptionFilter,
  ],
})
export class ObservabilityModule {}
