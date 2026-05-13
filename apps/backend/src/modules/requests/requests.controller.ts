import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '../auth';
import { UserRole } from '@prisma/client';
import { RequestsService } from './requests.service';
import { CustomerRequestListResponseDto } from './dto/customer-request-list-response.dto';
import type { AuthenticatedUser } from '../auth';

@ApiTags('requests')
@Controller('requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Get()
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'List all service requests for the authenticated customer' })
  async findAll(@CurrentUser() user: AuthenticatedUser): Promise<CustomerRequestListResponseDto> {
    return this.requestsService.findAllForCustomer(user.userId);
  }
}
