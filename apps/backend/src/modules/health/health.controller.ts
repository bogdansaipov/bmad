import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaHealthIndicator } from './prisma-health.indicator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check — returns 200 OK or 503 if DB is unreachable' })
  @HealthCheck()
  async check(): Promise<{ status: string; database: string; timestamp: string }> {
    const result = await this.health.check([
      () => this.prismaHealth.isHealthy('database'),
    ]);
    return {
      status: 'ok',
      database: result.info?.['database']?.status === 'up' ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
    };
  }
}
