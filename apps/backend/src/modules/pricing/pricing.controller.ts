import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth';
import { GetEstimateQueryDto } from './dto/get-estimate-query.dto';
import { PricingService } from './pricing.service';

@ApiTags('pricing')
@Controller('pricing')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get('estimate')
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Get pricing estimate for a service category' })
  getEstimate(@Query() query: GetEstimateQueryDto) {
    return this.pricingService.calculateEstimate(query.categoryId);
  }
}
