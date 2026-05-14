import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '../auth';
import type { AuthenticatedUser } from '../auth';
import { HandymanJobFeedResponseDto } from './dto/handyman-job-feed-response.dto';
import { MatchingService } from './matching.service';

@ApiTags('matching')
@Controller('matching')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @Get('job-offers/me')
  @Roles(UserRole.HANDYMAN)
  @ApiOperation({ summary: 'List pending visible job offers for the authenticated handyman' })
  findMyVisibleOffers(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<HandymanJobFeedResponseDto> {
    return this.matchingService.findAvailableOffersForHandyman(user.userId);
  }
}
