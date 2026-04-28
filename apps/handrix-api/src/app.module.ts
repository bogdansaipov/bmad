import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ObservabilityModule } from './common/observability/observability.module';
import { RequestContextMiddleware } from './common/observability/request-context.middleware';
import { AppThrottlerGuard } from './common/security/app-throttler.guard';
import { parseAppEnv } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { MeasurementModule } from './modules/measurement/measurement.module';
import { OpsModule } from './modules/ops/ops.module';
import { ReferenceDataModule } from './modules/reference-data/reference-data.module';
import { RequestsModule } from './modules/requests/requests.module';
import { SupportModule } from './modules/support/support.module';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      useFactory: () => {
        const env = parseAppEnv();

        return [
          {
            ttl: env.rateLimitDefaultTtlMs,
            limit: env.rateLimitDefaultLimit,
          },
        ];
      },
    }),
    ObservabilityModule,
    PrismaModule,
    AuthModule,
    HealthModule,
    MeasurementModule,
    OpsModule,
    ReferenceDataModule,
    RequestsModule,
    SupportModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AppThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
