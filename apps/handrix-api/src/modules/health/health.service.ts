import {
  requestLifecycleStates,
  type HealthPayload,
} from '@handrix/shared-contracts';
import { Injectable } from '@nestjs/common';
import { ObservabilityService } from '../../common/observability/observability.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly observabilityService: ObservabilityService = new ObservabilityService(),
  ) {}

  async getHealthPayload(): Promise<HealthPayload> {
    const database = await this.observabilityService.checkDatabaseReadiness();
    const readiness =
      database.status === 'ok'
        ? {
            status: 'ok' as const,
            detail: 'The API and its required dependencies are ready.',
          }
        : {
            status: 'error' as const,
            detail:
              'The API is running but one or more required dependencies are unavailable.',
          };

    const payload: HealthPayload = {
      service: 'handrix-api',
      status: database.status === 'ok' ? 'ok' : 'degraded',
      supportedLifecycleStates: [...requestLifecycleStates],
      checks: {
        liveness: {
          status: 'ok',
          detail: 'The API process is running and accepting requests.',
        },
        readiness,
        database,
      },
    };

    await this.observabilityService.recordEvent({
      eventName: 'health.readiness.checked',
      routeScope: 'health',
      actorType: 'system',
      outcome: payload.status === 'ok' ? 'success' : 'error',
      metadata: {
        serviceStatus: payload.status,
        databaseStatus: database.status,
      },
    });

    return payload;
  }
}
