import { requestLifecycleStates } from '@handrix/shared-contracts';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './../src/app.module';
import { HealthController } from './../src/modules/health/health.controller';
import { ReferenceDataController } from './../src/modules/reference-data/reference-data.controller';
import { RequestsController } from './../src/modules/requests/requests.controller';

describe('API integration (e2e)', () => {
  let app: INestApplication;
  let healthController: HealthController;
  let referenceDataController: ReferenceDataController;
  let requestsController: RequestsController;
  const originalEnv = process.env;

  beforeEach(async () => {
    process.env = {
      ...originalEnv,
      HANDRIX_ENV: 'test',
      HANDRIX_INTERNAL_AUTH_SECRET: 'test-internal-auth-secret',
      HANDRIX_INTERNAL_AUTH_ISSUER: 'handrix-test-suite',
      HANDRIX_OPS_EMAIL: 'ops@handrix.local',
      HANDRIX_OPS_PASSWORD: 'ops-demo-pass',
      HANDRIX_SUPPORT_EMAIL: 'support@handrix.local',
      HANDRIX_SUPPORT_PASSWORD: 'support-demo-pass',
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    healthController = app.get(HealthController);
    referenceDataController = app.get(ReferenceDataController);
    requestsController = app.get(RequestsController);
  });

  it('returns the health envelope through the Nest application module', () => {
    const response = healthController.getHealth();

    expect(response.data).toEqual({
      service: 'handrix-api',
      status: 'ok',
      supportedLifecycleStates: requestLifecycleStates,
    });
    expect(typeof response.meta?.generatedAt).toBe('string');
  });

  it('returns the supported issue types through the Nest application module', () => {
    const response = referenceDataController.getIssueTypes();

    expect(response.data).toEqual(
      referenceDataController['referenceDataService'].getIssueTypes(),
    );
    expect(typeof response.meta?.generatedAt).toBe('string');
  });

  it('returns intake questions through the Nest application module', () => {
    const response =
      referenceDataController.getIntakeQuestionSet('under-sink-leak');

    expect(response.data.issueTypeId).toBe('under-sink-leak');
    expect(response.data.questions).toHaveLength(2);
  });

  it('returns recovery-aware containment guidance through the Nest application module', () => {
    const response = referenceDataController.getContainmentGuidance(
      'clogged-toilet',
      {
        serviceabilityStatus: 'needsRecovery',
        nextStep: 'showRecoveryPath',
        recoveryCode: 'UNSUPPORTED_REQUEST_DETAILS',
      },
    );

    expect(response.data.issueTypeId).toBe('clogged-toilet');
    expect(response.data.variant).toBe('recovery');
    expect(response.data.warnings.length).toBeGreaterThan(0);
    expect(typeof response.meta?.generatedAt).toBe('string');
  });

  it('returns intake classification through the Nest application module', () => {
    const response = requestsController.createIntakeEvaluation({
      issueTypeId: 'dripping-faucet',
      answers: [
        { questionId: 'singleFixture', value: true },
        { questionId: 'shutoffAccessible', value: true },
      ],
      serviceLocation: {
        addressLine1: '125 West 26th Street',
        city: 'New York',
        postalCode: '10001',
        unitOrAccessNote: '',
        locationDetails: '3rd floor apartment',
      },
    });

    expect(response.data.serviceabilityStatus).toBe('serviceable');
    expect(response.data.nextStep).toBe('continueToContainment');
    expect(typeof response.meta?.generatedAt).toBe('string');
  });

  it('returns a request review summary through the Nest application module', () => {
    const response = requestsController.createRequestReviewSummary({
      issueTypeId: 'slow-drain',
      answers: [
        { questionId: 'singleDrainAffected', value: true },
        { questionId: 'standingWater', value: true },
      ],
      serviceLocation: {
        addressLine1: '15 Spring Street',
        city: 'New York',
        postalCode: '10011',
        unitOrAccessNote: '',
        locationDetails: 'Bathroom sink on the second floor',
      },
      classification: {
        issueTypeId: 'slow-drain',
        serviceabilityStatus: 'serviceable',
        nextStep: 'continueToContainment',
        summaryHeadline:
          'This request can keep moving through the guided flow.',
        summaryDetail:
          'You are still within the supported plumbing scope and service area for the next Handrix step.',
      },
    });

    expect(response.data.issueLabel).toBe('Slow drain');
    expect(response.data.nextSteps.bullets.length).toBeGreaterThan(0);
    expect(typeof response.meta?.generatedAt).toBe('string');
  });

  it('creates an anonymous request through the Nest application module', async () => {
    const response = await requestsController.createRequest({
      issueTypeId: 'slow-drain',
      answers: [
        { questionId: 'singleDrainAffected', value: true },
        { questionId: 'standingWater', value: true },
      ],
      serviceLocation: {
        addressLine1: '15 Spring Street',
        city: 'New York',
        postalCode: '10011',
        unitOrAccessNote: '',
        locationDetails: 'Bathroom sink on the second floor',
      },
      classification: {
        issueTypeId: 'slow-drain',
        serviceabilityStatus: 'serviceable',
        nextStep: 'continueToContainment',
        summaryHeadline:
          'This request can keep moving through the guided flow.',
        summaryDetail:
          'You are still within the supported plumbing scope and service area for the next Handrix step.',
      },
      idempotencyKey: 'e2e-submit-1',
    });

    expect(response.data.publicId).toMatch(/^hrx_/);
    expect(response.data).not.toHaveProperty('lifecycleState');
    expect(response.data.publicStatusLabel).toBe('Request received');
    expect(response.data.trackingCredential.token).toContain('.');
    expect(typeof response.meta?.generatedAt).toBe('string');
  });

  it('returns tracked request status through the Nest application module', async () => {
    const createdRequest = await requestsController.createRequest({
      issueTypeId: 'slow-drain',
      answers: [
        { questionId: 'singleDrainAffected', value: true },
        { questionId: 'standingWater', value: true },
      ],
      serviceLocation: {
        addressLine1: '15 Spring Street',
        city: 'New York',
        postalCode: '10011',
        unitOrAccessNote: '',
        locationDetails: 'Bathroom sink on the second floor',
      },
      classification: {
        issueTypeId: 'slow-drain',
        serviceabilityStatus: 'serviceable',
        nextStep: 'continueToContainment',
        summaryHeadline:
          'This request can keep moving through the guided flow.',
        summaryDetail:
          'You are still within the supported plumbing scope and service area for the next Handrix step.',
      },
      idempotencyKey: 'e2e-status-lookup-1',
    });

    const response = await requestsController.createRequestStatusLookup({
      publicId: createdRequest.data.publicId,
      trackingToken: createdRequest.data.trackingCredential.token,
    });

    expect(response.data.publicId).toBe(createdRequest.data.publicId);
    expect(response.data.publicStatusLabel).toBe('Request received');
    expect(response.data.nextStepDetail).toContain('reviewing your request');
    expect(response.data.latestChangeSummary).toContain(
      'Customer confirmed the anonymous request',
    );
    expect(response.data.timeline).toEqual([
      expect.objectContaining({
        publicStatus: 'received',
        publicStatusLabel: 'Request received',
        isCurrent: true,
      }),
    ]);
    expect(response.data.history).toEqual([
      expect.objectContaining({
        previousPublicStatus: null,
        publicStatus: 'received',
      }),
    ]);
    expect(typeof response.meta?.generatedAt).toBe('string');
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }

    process.env = originalEnv;
  });
});
