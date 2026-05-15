import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '../auth';
import type { AuthenticatedUser } from '../auth';
import { HandymanJobFeedItemDto, HandymanJobFeedResponseDto } from './dto/handyman-job-feed-response.dto';
import { HandymanJobHistoryItemDto, HandymanJobHistoryResponseDto } from './dto/handyman-job-history-response.dto';
import { MatchingService } from './matching.service';

@ApiTags('jobs')
@Controller('jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @Get('history')
  @Roles(UserRole.HANDYMAN)
  @ApiOperation({ summary: 'List past job offers for the authenticated handyman' })
  @ApiResponse({ status: 200, type: HandymanJobHistoryItemDto, isArray: true })
  getJobHistory(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<HandymanJobHistoryResponseDto> {
    return this.matchingService.findJobHistoryForHandyman(user.userId);
  }

  @Get('available')
  @Roles(UserRole.HANDYMAN)
  @ApiOperation({ summary: 'List pending job offers for the authenticated handyman' })
  @ApiResponse({ status: 200, type: HandymanJobFeedItemDto, isArray: true })
  findAvailableJobs(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<HandymanJobFeedResponseDto> {
    return this.matchingService.findAvailableOffersForHandyman(user.userId);
  }
}
