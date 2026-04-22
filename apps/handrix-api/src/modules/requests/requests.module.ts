import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ReferenceDataModule } from '../reference-data/reference-data.module';
import { RequestStoreService } from './request-store.service';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';

@Module({
  imports: [PrismaModule, ReferenceDataModule],
  controllers: [RequestsController],
  providers: [RequestsService, RequestStoreService],
  exports: [RequestStoreService],
})
export class RequestsModule {}
