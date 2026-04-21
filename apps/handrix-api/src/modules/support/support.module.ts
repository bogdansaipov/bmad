import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RequestsModule } from '../requests/requests.module';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';

@Module({
  imports: [AuthModule, RequestsModule],
  controllers: [SupportController],
  providers: [SupportService],
})
export class SupportModule {}
