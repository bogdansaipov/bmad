import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AccountStatus, Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

// Spy on bcrypt.compare at the module level so we can track calls in the unknown-email test.
// bcryptjs properties may not be configurable, so we wrap via jest.mock at the top (hoisted).
jest.mock('bcryptjs', () => {
  const actual = jest.requireActual<typeof import('bcryptjs')>('bcryptjs');
  return {
    ...actual,
    compare: jest.fn((password: string, hash: string) => actual.compare(password, hash)),
    hash: jest.fn((password: string, rounds: number) => actual.hash(password, rounds)),
    hashSync: jest.fn((password: string, rounds: number) => actual.hashSync(password, rounds)),
  };
});

const mockPrismaService = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
  },
  customerProfile: {
    create: jest.fn(),
  },
  handymanProfile: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock.jwt.token'),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Restore pass-through behavior after clearAllMocks
    (bcrypt.compare as jest.Mock).mockImplementation((p: string, h: string) =>
      jest.requireActual<typeof import('bcryptjs')>('bcryptjs').compare(p, h),
    );
    (bcrypt.hash as jest.Mock).mockImplementation((p: string, r: number) =>
      jest.requireActual<typeof import('bcryptjs')>('bcryptjs').hash(p, r),
    );
    mockPrismaService.$transaction.mockImplementation(async (fn: (tx: typeof mockPrismaService) => Promise<unknown>) =>
      fn(mockPrismaService),
    );
    service = new AuthService(mockPrismaService as unknown as PrismaService, mockJwtService as unknown as JwtService);
  });

  describe('register()', () => {
    const dto: RegisterDto = {
      email: 'test@example.com',
      password: 'password123',
      role: UserRole.CUSTOMER,
      displayName: 'Test User',
    };

    it('success path: creates user + customer profile, returns JWT', async () => {
      const created = { id: 'user-uuid-1' };
      const fresh = { id: 'user-uuid-1', email: dto.email, role: UserRole.CUSTOMER };

      mockPrismaService.user.create.mockResolvedValue(created);
      mockPrismaService.customerProfile.create.mockResolvedValue({});
      mockPrismaService.user.findUniqueOrThrow.mockResolvedValue(fresh);

      const result = await service.register(dto);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockPrismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: dto.email, role: UserRole.CUSTOMER }),
          select: { id: true },
        }),
      );
      expect(mockPrismaService.customerProfile.create).toHaveBeenCalledWith({
        data: { userId: created.id, displayName: dto.displayName },
      });
      expect(mockPrismaService.user.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: created.id },
        select: { id: true, email: true, role: true },
      });
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: fresh.id,
        email: fresh.email,
        role: fresh.role,
      });
      expect(result).toEqual({
        userId: fresh.id,
        email: fresh.email,
        role: fresh.role,
        accessToken: 'mock.jwt.token',
      });
    });

    it('success path: creates handyman profile when role is HANDYMAN', async () => {
      const handymanDto = { ...dto, role: UserRole.HANDYMAN };
      const created = { id: 'user-uuid-2' };
      const fresh = { id: 'user-uuid-2', email: dto.email, role: UserRole.HANDYMAN };

      mockPrismaService.user.create.mockResolvedValue(created);
      mockPrismaService.handymanProfile.create.mockResolvedValue({});
      mockPrismaService.user.findUniqueOrThrow.mockResolvedValue(fresh);

      await service.register(handymanDto);

      expect(mockPrismaService.handymanProfile.create).toHaveBeenCalledWith({
        data: { userId: created.id, displayName: handymanDto.displayName },
      });
      expect(mockPrismaService.customerProfile.create).not.toHaveBeenCalled();
    });

    it('duplicate email: throws ConflictException when create raises P2002', async () => {
      mockPrismaService.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });

    it('password is bcrypt-hashed (not stored as plaintext)', async () => {
      const created = { id: 'user-uuid-3' };
      const fresh = { id: 'user-uuid-3', email: dto.email, role: UserRole.CUSTOMER };
      const realBcrypt = jest.requireActual<typeof import('bcryptjs')>('bcryptjs');

      mockPrismaService.user.create.mockImplementation(async ({ data }: { data: { password_hash: string } }) => {
        expect(data.password_hash).not.toEqual(dto.password);
        const isHashed = await realBcrypt.compare(dto.password, data.password_hash);
        expect(isHashed).toBe(true);
        return created;
      });
      mockPrismaService.customerProfile.create.mockResolvedValue({});
      mockPrismaService.user.findUniqueOrThrow.mockResolvedValue(fresh);

      await service.register(dto);
    });

    it('role in JWT comes from DB re-read, not client input (defense-in-depth)', async () => {
      const created = { id: 'user-uuid-4' };
      const fresh = { id: 'user-uuid-4', email: dto.email, role: UserRole.CUSTOMER };

      mockPrismaService.user.create.mockResolvedValue(created);
      mockPrismaService.customerProfile.create.mockResolvedValue({});
      mockPrismaService.user.findUniqueOrThrow.mockResolvedValue(fresh);

      await service.register(dto);

      const signCallOrder = mockJwtService.sign.mock.invocationCallOrder[0];
      const reReadCallOrder = mockPrismaService.user.findUniqueOrThrow.mock.invocationCallOrder[0];
      expect(reReadCallOrder).toBeLessThan(signCallOrder);
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ role: fresh.role }),
      );
    });
  });

  describe('login()', () => {
    const dto: LoginDto = {
      email: 'user@example.com',
      password: 'password123',
    };

    async function makeDbUser(overrides: Partial<{
      id: string;
      email: string;
      password_hash: string;
      role: UserRole;
      account_status: AccountStatus;
    }> = {}) {
      const realBcrypt = jest.requireActual<typeof import('bcryptjs')>('bcryptjs');
      const hash = await realBcrypt.hash(dto.password, 10);
      return {
        id: 'user-uuid-login',
        email: dto.email,
        password_hash: hash,
        role: UserRole.CUSTOMER,
        account_status: AccountStatus.ACTIVE,
        ...overrides,
      };
    }

    it('success: customer credentials → returns userId, email, role CUSTOMER, accessToken', async () => {
      const user = await makeDbUser();
      mockPrismaService.user.findUnique.mockResolvedValue(user);

      const result = await service.login(dto);

      expect(result).toEqual({
        userId: user.id,
        email: user.email,
        role: UserRole.CUSTOMER,
        accessToken: 'mock.jwt.token',
      });
      expect(mockJwtService.sign).toHaveBeenCalledWith({ sub: user.id, email: user.email, role: user.role });
    });

    it('success: handyman credentials → returns role HANDYMAN', async () => {
      const user = await makeDbUser({ role: UserRole.HANDYMAN });
      mockPrismaService.user.findUnique.mockResolvedValue(user);

      const result = await service.login(dto);

      expect(result.role).toBe(UserRole.HANDYMAN);
    });

    it('wrong password → throws UnauthorizedException with generic message', async () => {
      const user = await makeDbUser();
      mockPrismaService.user.findUnique.mockResolvedValue(user);

      const badDto: LoginDto = { email: dto.email, password: 'wrongpassword' };

      await expect(service.login(badDto)).rejects.toThrow(
        new UnauthorizedException('Invalid email or password'),
      );
      expect(bcrypt.compare).toHaveBeenCalledTimes(1);
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('unknown email → throws same UnauthorizedException; bcrypt.compare IS still called', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      (bcrypt.compare as jest.Mock).mockClear();

      await expect(service.login(dto)).rejects.toThrow(
        new UnauthorizedException('Invalid email or password'),
      );

      // Verify constant-time: bcrypt.compare called even when email is unknown
      expect(bcrypt.compare).toHaveBeenCalledTimes(1);
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('account_status SUSPENDED → throws UnauthorizedException, no JWT signed', async () => {
      const user = await makeDbUser({ account_status: AccountStatus.SUSPENDED });
      mockPrismaService.user.findUnique.mockResolvedValue(user);

      await expect(service.login(dto)).rejects.toThrow(
        new UnauthorizedException('Invalid email or password'),
      );
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('account_status DELETED → throws UnauthorizedException, no JWT signed', async () => {
      const user = await makeDbUser({ account_status: AccountStatus.DELETED });
      mockPrismaService.user.findUnique.mockResolvedValue(user);

      await expect(service.login(dto)).rejects.toThrow(
        new UnauthorizedException('Invalid email or password'),
      );
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('JWT payload role comes from DB row, not from any input', async () => {
      // DB returns HANDYMAN even though dto has no role field
      const user = await makeDbUser({ role: UserRole.HANDYMAN });
      mockPrismaService.user.findUnique.mockResolvedValue(user);

      await service.login(dto);

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ role: UserRole.HANDYMAN }),
      );
    });
  });
});
