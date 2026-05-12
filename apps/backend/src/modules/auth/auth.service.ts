import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AccountStatus, Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { RegisterDto } from './dto/register.dto';
import { RegisterResponseDto } from './dto/register-response.dto';
import { JwtPayload } from './types/jwt-payload';

// Pre-computed once at module load so the unknown-email path still runs
// bcrypt.compare (constant-time defense against the trivial 0ms-vs-bcrypt-cost leak).
const PLACEHOLDER_HASH = bcrypt.hashSync('placeholder-not-a-real-password', 10);

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<RegisterResponseDto> {
    const passwordHash = await bcrypt.hash(dto.password, 10);

    let user: { id: string; email: string; role: UserRole };
    try {
      user = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            email: dto.email,
            password_hash: passwordHash,
            role: dto.role,
          },
          select: { id: true },
        });

        if (dto.role === UserRole.CUSTOMER) {
          await tx.customerProfile.create({
            data: { userId: created.id, displayName: dto.displayName },
          });
        } else {
          await tx.handymanProfile.create({
            data: { userId: created.id, displayName: dto.displayName },
          });
        }

        return tx.user.findUniqueOrThrow({
          where: { id: created.id },
          select: { id: true, email: true, role: true },
        });
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Email already registered');
      }
      throw err;
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const accessToken = this.jwtService.sign(payload);

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      accessToken,
    };
  }

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true, email: true, password_hash: true, role: true, account_status: true },
    });

    const hashToCompare = user?.password_hash ?? PLACEHOLDER_HASH;
    const ok = await bcrypt.compare(dto.password, hashToCompare);

    if (!user || !ok || user.account_status !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const accessToken = this.jwtService.sign(payload);

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      accessToken,
    };
  }
}
