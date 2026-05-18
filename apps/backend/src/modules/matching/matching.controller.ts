import { Body, Controller, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '../auth';
import type { AuthenticatedUser } from '../auth';
import { ActiveJobResponseDto } from './dto/active-job-response.dto';
import { HandymanJobFeedItemDto, HandymanJobFeedResponseDto } from './dto/handyman-job-feed-response.dto';
import { HandymanJobHistoryItemDto, HandymanJobHistoryResponseDto } from './dto/handyman-job-history-response.dto';
import { PostLocationDto } from './dto/post-location.dto';
import { UpdateJobStatusDto } from './dto/update-job-status.dto';
import { MatchingService } from './matching.service';

@ApiTags('jobs')
@Controller('jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @Get('active/:requestId')
  @Roles(UserRole.HANDYMAN)
  @ApiOperation({ summary: 'Get active job details for the authenticated handyman' })
  getActiveJob(
    @CurrentUser() user: AuthenticatedUser,
    @Param('requestId') requestId: string,
  ): Promise<ActiveJobResponseDto> {
    return this.matchingService.getActiveJobForHandyman(user.userId, requestId);
  }

  @Patch('active/:requestId/status')
  @Roles(UserRole.HANDYMAN)
  @ApiOperation({ summary: 'Update job status for the authenticated handyman' })
  updateJobStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('requestId') requestId: string,
    @Body() body: UpdateJobStatusDto,
  ): Promise<{ requestId: string; status: string }> {
    return this.matchingService.updateJobStatus(user.userId, requestId, body.status);
  }

  @Post('active/:requestId/location')
  @Roles(UserRole.HANDYMAN)
  @HttpCode(201)
  @ApiOperation({ summary: 'Post current location for active job' })
  postLocation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('requestId') requestId: string,
    @Body() body: PostLocationDto,
  ): Promise<{ id: string; recordedAt: string }> {
    return this.matchingService.postHandymanLocation(user.userId, requestId, body.lat, body.lng);
  }

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
