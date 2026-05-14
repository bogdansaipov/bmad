import { Module } from '@nestjs/common';
import { MatchingModule } from '../matching/matching.module';
import { PricingModule } from '../pricing/pricing.module';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';

@Module({
  imports: [PricingModule, MatchingModule],
  controllers: [RequestsController],
  providers: [RequestsService],
})
export class RequestsModule {}
