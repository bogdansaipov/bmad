import { requestLifecycleStates } from '@handrix/shared-contracts';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns the shared success response envelope', () => {
    const controller = new HealthController();
    const response = controller.getHealth();

    expect(response.data).toEqual({
      service: 'handrix-api',
      status: 'ok',
      supportedLifecycleStates: requestLifecycleStates,
    });
    expect(typeof response.meta?.generatedAt).toBe('string');
  });
});
