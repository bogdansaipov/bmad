import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthCheckService } from '@nestjs/terminus';
import { PrismaHealthIndicator } from './prisma-health.indicator';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: { check: jest.Mock };
  let prismaHealth: { isHealthy: jest.Mock };

  beforeEach(async () => {
    healthCheckService = { check: jest.fn() };
    prismaHealth = { isHealthy: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: healthCheckService },
        { provide: PrismaHealthIndicator, useValue: prismaHealth },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('check() delegates to HealthCheckService', async () => {
    const expected = { status: 'ok', info: { database: { status: 'up' } } };
    healthCheckService.check.mockResolvedValue(expected);
    prismaHealth.isHealthy.mockResolvedValue({ database: { status: 'up' } });

    const result = await controller.check();
    expect(healthCheckService.check).toHaveBeenCalled();
    expect(result).toEqual(expected);
  });
});
