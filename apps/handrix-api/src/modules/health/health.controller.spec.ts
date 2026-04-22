import { requestLifecycleStates } from '@handrix/shared-contracts';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  it('returns the shared success response envelope', async () => {
    const healthService = {
      getHealthPayload: jest.fn().mockResolvedValue({
        service: 'handrix-api',
        status: 'ok',
        supportedLifecycleStates: requestLifecycleStates,
        checks: {
          liveness: {
            status: 'ok',
            detail: 'The API process is running and accepting requests.',
          },
          readiness: {
            status: 'ok',
            detail: 'The API and its required dependencies are ready.',
          },
          database: {
            status: 'ok',
            detail: 'Database connection is ready.',
          },
        },
      }),
    } satisfies Pick<HealthService, 'getHealthPayload'>;
    const controller = new HealthController(
      healthService as unknown as HealthService,
    );
    const response = await controller.getHealth();

    expect(response.data).toEqual({
      service: 'handrix-api',
      status: 'ok',
      supportedLifecycleStates: requestLifecycleStates,
      checks: {
        liveness: {
          status: 'ok',
          detail: 'The API process is running and accepting requests.',
        },
        readiness: {
          status: 'ok',
          detail: 'The API and its required dependencies are ready.',
        },
        database: {
          status: 'ok',
          detail: 'Database connection is ready.',
        },
      },
    });
    expect(typeof response.meta?.generatedAt).toBe('string');
  });
});
