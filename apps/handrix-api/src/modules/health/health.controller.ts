import {
  createSuccessResponse,
  type HealthPayload,
} from '@handrix/shared-contracts';
import { Controller, Get, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { SkipDefaultThrottle } from '../../common/security/throttle-policies';
import { healthOpenApiExamples } from '../../common/swagger/shared-contract-openapi';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly healthService: HealthService = new HealthService(),
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'Return API liveness and readiness information for local and deployed environments.',
  })
  @ApiOkResponse({
    description:
      'The Handrix API health payload, wrapped in the shared success envelope.',
    schema: {
      example: healthOpenApiExamples.response,
    },
  })
  @SkipDefaultThrottle()
  async getHealth(@Res({ passthrough: true }) response?: Response) {
    const payload: HealthPayload = await this.healthService.getHealthPayload();

    if (response && payload.status === 'degraded') {
      response.status(503);
    }

    return createSuccessResponse(payload, {
      generatedAt: new Date().toISOString(),
    });
  }
}
