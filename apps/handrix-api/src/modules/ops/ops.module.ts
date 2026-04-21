import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ReferenceDataModule } from '../reference-data/reference-data.module';
import { RequestsModule } from '../requests/requests.module';
import { OpsController } from './ops.controller';
import { OpsService } from './ops.service';

@Module({
  imports: [AuthModule, RequestsModule, ReferenceDataModule],
  controllers: [OpsController],
  providers: [OpsService],
})
export class OpsModule {}
