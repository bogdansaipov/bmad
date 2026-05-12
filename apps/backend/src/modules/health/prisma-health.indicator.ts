import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return this.getStatus(key, true);
    } catch (error) {
      const errorMessage =
        process.env['NODE_ENV'] !== 'production'
          ? String(error)
          : 'Database connectivity check failed';
      throw new HealthCheckError(
        'PrismaCheck failed',
        this.getStatus(key, false, { error: errorMessage }),
      );
    }
  }
}
