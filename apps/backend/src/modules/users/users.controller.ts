import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '../auth';
import type { AuthenticatedUser } from '../auth';
import { HandymanProfileSetupResponseDto } from './dto/handyman-profile-response.dto';
import { UpdateHandymanProfileDto } from './dto/update-handyman-profile.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me/handyman-profile')
  @Roles(UserRole.HANDYMAN)
  @ApiOperation({ summary: 'Return the current handyman profile and category preferences' })
  getMyHandymanProfile(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<HandymanProfileSetupResponseDto> {
    return this.usersService.getHandymanProfile(user.userId);
  }

  @Put('me/handyman-profile')
  @Roles(UserRole.HANDYMAN)
  @ApiOperation({ summary: 'Update the current handyman service radius and category preferences' })
  updateMyHandymanProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateHandymanProfileDto,
  ): Promise<HandymanProfileSetupResponseDto> {
    return this.usersService.updateHandymanProfile(user.userId, body);
  }
}
