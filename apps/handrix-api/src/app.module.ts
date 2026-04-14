import { Module } from '@nestjs/common';
import { HealthModule } from './modules/health/health.module';
import { ReferenceDataModule } from './modules/reference-data/reference-data.module';
import { RequestsModule } from './modules/requests/requests.module';

@Module({
  imports: [HealthModule, ReferenceDataModule, RequestsModule],
})
export class AppModule {}
