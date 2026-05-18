import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '../auth';
import type { AuthenticatedUser } from '../auth';
import { RatingsService } from './ratings.service';
import { SubmitRatingDto } from './dto/submit-rating.dto';

@ApiTags('ratings')
@Controller('ratings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Post()
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Submit a rating for a completed request' })
  submitRating(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: SubmitRatingDto,
  ) {
    return this.ratingsService.submitRating(
      user.userId,
      body.requestId,
      body.stars,
      body.shortFeedback,
    );
  }

  @Get('by-request/:requestId')
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Get rating status for a specific request' })
  getRatingStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('requestId') requestId: string,
  ) {
    return this.ratingsService.getRatingStatus(user.userId, requestId);
  }
}
