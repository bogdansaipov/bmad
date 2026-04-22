import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { Express } from 'express';
import helmet from 'helmet';
import { AppLogger } from './common/observability/app-logger';
import { parseAppEnv } from './config/env.validation';

export function configureApp(app: INestApplication) {
  const env = parseAppEnv();
  const httpServer = app.getHttpAdapter().getInstance() as unknown as Express;

  if (env.trustProxy) {
    httpServer.set('trust proxy', true);
  }

  app.use(
    helmet({
      // Swagger UI relies on inline assets that would otherwise be blocked.
      contentSecurityPolicy: false,
    }),
  );
  app.useLogger(app.get(AppLogger));
  app.enableCors({
    origin: env.corsOrigin,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Handrix API')
    .setDescription('Foundation API surface for the Handrix MVP.')
    .setVersion('0.1.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);
}
