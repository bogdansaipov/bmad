import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { JwtStrategy } from './jwt.strategy';
import type { JwtPayload } from '../types/jwt-payload';

const mockConfigService = {
  getOrThrow: jest.fn().mockReturnValue('test-secret'),
} as unknown as ConfigService;

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    strategy = new JwtStrategy(mockConfigService);
  });

  it('maps { sub, email, role } payload → { userId, email, role }', () => {
    const payload: JwtPayload = {
      sub: 'user-uuid-1',
      email: 'user@example.com',
      role: UserRole.CUSTOMER,
    };

    const result = strategy.validate(payload);

    expect(result).toEqual({
      userId: 'user-uuid-1',
      email: 'user@example.com',
      role: UserRole.CUSTOMER,
    });
  });

  it('maps HANDYMAN role correctly', () => {
    const payload: JwtPayload = {
      sub: 'user-uuid-2',
      email: 'handyman@example.com',
      role: UserRole.HANDYMAN,
    };

    const result = strategy.validate(payload);

    expect(result.role).toBe(UserRole.HANDYMAN);
    expect(result.userId).toBe('user-uuid-2');
  });
});
