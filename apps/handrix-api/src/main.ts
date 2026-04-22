import { NestFactory } from '@nestjs/core';
import { configureApp } from './app.bootstrap';
import { AppModule } from './app.module';
import { parseAppEnv } from './config/env.validation';

async function bootstrap() {
  const env = parseAppEnv();
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  await app.listen(env.port);
}
void bootstrap();
