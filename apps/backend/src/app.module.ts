import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { validate } from './config/env.validation';
import { PrismaModule } from './modules/prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { RequestsModule } from './modules/requests/requests.module';
import { MatchingModule } from './modules/matching/matching.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { RatingsModule } from './modules/ratings/ratings.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { MapsModule } from './modules/maps/maps.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { ObservabilityModule } from './modules/observability/observability.module';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { MiddlewareConsumer, NestModule } from '@nestjs/common';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate }),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 60 },
    ]),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env['NODE_ENV'] === 'development'
            ? { target: 'pino-pretty' }
            : undefined,
        customProps: (req) => ({
          context: 'HTTP',
          correlationId: (req as { headers: Record<string, string> }).headers['x-correlation-id'],
        }),
        serializers: {
          req(req) {
            return { method: req.method, url: req.url };
          },
        },
      },
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    RequestsModule,
    MatchingModule,
    AssignmentsModule,
    RealtimeModule,
    RatingsModule,
    PricingModule,
    MapsModule,
    UploadsModule,
    ObservabilityModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
