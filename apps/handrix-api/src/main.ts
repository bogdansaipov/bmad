import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { parseAppEnv } from './config/env.validation';

async function bootstrap() {
  const env = parseAppEnv();
  const app = await NestFactory.create(AppModule);

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

  await app.listen(env.port);
}
void bootstrap();
