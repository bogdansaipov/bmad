import {
  Controller,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '../auth';
import type { AuthenticatedUser } from '../auth';
import type { AcceptJobResponse, DeclineJobResponse } from '@handrix/contracts';
import { AssignmentsService } from './assignments.service';

@ApiTags('assignments')
@Controller('assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Post(':offerId/accept')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Roles(UserRole.HANDYMAN)
  @HttpCode(200)
  acceptJob(
    @CurrentUser() user: AuthenticatedUser,
    @Param('offerId') offerId: string,
  ): Promise<AcceptJobResponse> {
    return this.assignmentsService.acceptJob(user.userId, offerId);
  }

  @Post(':offerId/decline')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Roles(UserRole.HANDYMAN)
  @HttpCode(200)
  declineJob(
    @CurrentUser() user: AuthenticatedUser,
    @Param('offerId') offerId: string,
  ): Promise<DeclineJobResponse> {
    return this.assignmentsService.declineJob(user.userId, offerId);
  }
}
