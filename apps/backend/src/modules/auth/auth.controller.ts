import { Body, Controller, Get, HttpCode, HttpStatus, NotFoundException, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { RegisterDto } from './dto/register.dto';
import { RegisterResponseDto } from './dto/register-response.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuthenticatedUser } from './types/authenticated-user';
import { UserRole } from '@prisma/client';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user account with role selection' })
  register(@Body() dto: RegisterDto): Promise<RegisterResponseDto> {
    return this.authService.register(dto);
  }

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate an existing user and return a JWT' })
  login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Return the current authenticated user session' })
  me(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }

  @Get('customer-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Smoke endpoint — customer role guard verification' })
  customerOnly(): { ok: boolean; role: string } {
    if (this.configService.getOrThrow<string>('NODE_ENV') === 'production') {
      throw new NotFoundException();
    }
    return { ok: true, role: 'CUSTOMER' };
  }

  @Get('handyman-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HANDYMAN)
  @ApiOperation({ summary: 'Smoke endpoint — handyman role guard verification' })
  handymanOnly(): { ok: boolean; role: string } {
    if (this.configService.getOrThrow<string>('NODE_ENV') === 'production') {
      throw new NotFoundException();
    }
    return { ok: true, role: 'HANDYMAN' };
  }
}
