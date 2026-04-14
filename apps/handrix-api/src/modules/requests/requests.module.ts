import { Module } from '@nestjs/common';
import { ReferenceDataModule } from '../reference-data/reference-data.module';
import { RequestStoreService } from './request-store.service';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';

@Module({
  imports: [ReferenceDataModule],
  controllers: [RequestsController],
  providers: [RequestsService, RequestStoreService],
})
export class RequestsModule {}
