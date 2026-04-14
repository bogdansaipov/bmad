import {
  createSuccessResponse,
  type HealthPayload,
  requestLifecycleStates,
} from '@handrix/shared-contracts';
import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({
    summary: 'Return API readiness information for local development.',
  })
  @ApiOkResponse({
    description:
      'The Handrix API foundation is up and returning the shared success envelope.',
  })
  getHealth() {
    const payload: HealthPayload = {
      service: 'handrix-api',
      status: 'ok',
      supportedLifecycleStates: [...requestLifecycleStates],
    };

    return createSuccessResponse(payload, {
      generatedAt: new Date().toISOString(),
    });
  }
}
