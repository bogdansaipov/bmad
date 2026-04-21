import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { OpsModule } from './modules/ops/ops.module';
import { ReferenceDataModule } from './modules/reference-data/reference-data.module';
import { RequestsModule } from './modules/requests/requests.module';

@Module({
  imports: [
    AuthModule,
    HealthModule,
    OpsModule,
    ReferenceDataModule,
    RequestsModule,
  ],
})
export class AppModule {}
