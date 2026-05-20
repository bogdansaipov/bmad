import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '../auth';
import { UserRole } from '@prisma/client';
import { RequestsService } from './requests.service';
import { CustomerRequestListResponseDto } from './dto/customer-request-list-response.dto';
import { CreateRequestDto } from './dto/create-request.dto';
import { CreateRequestResponseDto } from './dto/create-request-response.dto';
import { RequestTrackingResponseDto } from './dto/request-tracking-response.dto';
import type { AuthenticatedUser } from '../auth';

@ApiTags('requests')
@Controller('requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Get(':requestId/tracking')
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Get tracking info for a customer request' })
  async getTracking(
    @CurrentUser() user: AuthenticatedUser,
    @Param('requestId') requestId: string,
  ): Promise<RequestTrackingResponseDto> {
    return this.requestsService.getTrackingForCustomer(user.userId, requestId);
  }

  @Get()
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'List all service requests for the authenticated customer' })
  async findAll(@CurrentUser() user: AuthenticatedUser): Promise<CustomerRequestListResponseDto> {
    return this.requestsService.findAllForCustomer(user.userId);
  }

  @Post()
  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @Roles(UserRole.CUSTOMER)
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a new service request' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateRequestDto,
  ): Promise<CreateRequestResponseDto> {
    return this.requestsService.create(user.userId, body);
  }
}
