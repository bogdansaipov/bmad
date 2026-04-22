import { HealthService } from './health.service';

describe('HealthService', () => {
  it('returns a degraded payload when database readiness fails', async () => {
    const observabilityService = {
      checkDatabaseReadiness: jest.fn().mockResolvedValue({
        status: 'error',
        detail: 'Database connection failed.',
      }),
      recordEvent: jest.fn().mockResolvedValue(undefined),
    };
    const service = new HealthService(observabilityService as never);

    const payload = await service.getHealthPayload();

    expect(payload.status).toBe('degraded');
    expect(payload.checks.readiness.status).toBe('error');
    expect(payload.checks.database.detail).toBe('Database connection failed.');
    expect(observabilityService.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'health.readiness.checked',
        outcome: 'error',
      }),
    );
  });
});
