import type {
  InternalSession,
  InternalSupportSession,
  SupportRequestSearchResponse,
} from '@handrix/shared-contracts';
import { requestLifecycleStates } from '@handrix/shared-contracts';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request, { type Response as SupertestResponse } from 'supertest';
import { AppModule } from './../src/app.module';
import { HealthController } from './../src/modules/health/health.controller';
import { ReferenceDataController } from './../src/modules/reference-data/reference-data.controller';
import { RequestsController } from './../src/modules/requests/requests.controller';

type SessionEnvelope = {
  data: InternalSession;
  meta?: { generatedAt: string };
};

type SupportSessionEnvelope = {
  data: InternalSupportSession;
  meta?: { generatedAt: string };
};

type SupportSearchEnvelope = {
  data: SupportRequestSearchResponse;
  meta?: { generatedAt: string };
};

function asEnvelope<T>(response: SupertestResponse): T {
  return response.body as T;
}

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

  it('signs in a support user and returns the protected support session over HTTP', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/internal-sessions')
      .send({
        email: 'support@handrix.local',
        password: 'support-demo-pass',
      })
      .expect(201);

    const login = asEnvelope<SessionEnvelope>(loginResponse);
    expect(login.data.user.role).toBe('support');
    expect(login.data.tokenType).toBe('Bearer');

    const sessionResponse = await request(app.getHttpServer())
      .get('/support/session')
      .set('Authorization', `Bearer ${login.data.accessToken}`)
      .expect(200);

    const session = asEnvelope<SupportSessionEnvelope>(sessionResponse);
    expect(session.data).toEqual({
      scope: 'support',
      message: 'Support access granted.',
      user: {
        id: 'support-default-user',
        email: 'support@handrix.local',
        displayName: 'Support Coordinator',
        role: 'support',
      },
    });
    expect(typeof session.meta?.generatedAt).toBe('string');
    expect(session.data).not.toHaveProperty('publicId');
  });

  it('rejects an unauthenticated GET /support/session with a 401 error envelope and no request data', async () => {
    const response = await request(app.getHttpServer())
      .get('/support/session')
      .expect(401);

    expect(response.body).toMatchObject({
      error: { code: 'INTERNAL_AUTH_REQUIRED' },
    });
    expect(response.body).not.toHaveProperty('data');
    expect(response.body).not.toHaveProperty('publicId');
    expect(response.body).not.toHaveProperty('request');
    expect(JSON.stringify(response.body)).not.toContain('hrx_');
  });

  it('rejects a malformed bearer token on /support/session with a 401 error envelope', async () => {
    const response = await request(app.getHttpServer())
      .get('/support/session')
      .set('Authorization', 'Bearer not.a.real.jwt.token')
      .expect(401);

    expect(response.body).toMatchObject({
      error: { code: 'INTERNAL_AUTH_INVALID' },
    });
  });

  it('rejects a support token on /ops/session with a 403 forbidden envelope (role isolation)', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/internal-sessions')
      .send({
        email: 'support@handrix.local',
        password: 'support-demo-pass',
      })
      .expect(201);

    const login = asEnvelope<SessionEnvelope>(loginResponse);
    const response = await request(app.getHttpServer())
      .get('/ops/session')
      .set('Authorization', `Bearer ${login.data.accessToken}`)
      .expect(403);

    expect(response.body).toMatchObject({
      error: { code: 'INTERNAL_AUTH_FORBIDDEN' },
    });
    expect(response.body).not.toHaveProperty('data');
  });

  it('rejects an ops token on /support/session with a 403 forbidden envelope (role isolation)', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/internal-sessions')
      .send({
        email: 'ops@handrix.local',
        password: 'ops-demo-pass',
      })
      .expect(201);

    const login = asEnvelope<SessionEnvelope>(loginResponse);
    const response = await request(app.getHttpServer())
      .get('/support/session')
      .set('Authorization', `Bearer ${login.data.accessToken}`)
      .expect(403);

    expect(response.body).toMatchObject({
      error: { code: 'INTERNAL_AUTH_FORBIDDEN' },
    });
    expect(response.body).not.toHaveProperty('data');
    expect(response.body).not.toHaveProperty('publicId');
    expect(JSON.stringify(response.body)).not.toContain('hrx_');
  });

  it('returns 200 + envelope for GET /support/requests with a valid support token', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/internal-sessions')
      .send({
        email: 'support@handrix.local',
        password: 'support-demo-pass',
      })
      .expect(201);
    const login = asEnvelope<SessionEnvelope>(loginResponse);

    const searchResponse = await request(app.getHttpServer())
      .get('/support/requests?q=hrx_')
      .set('Authorization', `Bearer ${login.data.accessToken}`)
      .expect(200);
    const searchEnvelope = asEnvelope<SupportSearchEnvelope>(searchResponse);

    expect(Array.isArray(searchEnvelope.data.items)).toBe(true);
    expect(typeof searchEnvelope.data.summary.totalMatched).toBe('number');
    expect(typeof searchEnvelope.data.summary.limitReached).toBe('boolean');
    expect(searchEnvelope.data.query).toMatchObject({
      q: 'hrx_',
      normalizedQ: 'hrx_',
    });
    expect(typeof searchEnvelope.meta?.generatedAt).toBe('string');
  });

  it('rejects GET /support/requests with an invalid limit using SUPPORT_SEARCH_QUERY_INVALID', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/internal-sessions')
      .send({
        email: 'support@handrix.local',
        password: 'support-demo-pass',
      })
      .expect(201);
    const login = asEnvelope<SessionEnvelope>(loginResponse);

    const response = await request(app.getHttpServer())
      .get('/support/requests?limit=not-a-number')
      .set('Authorization', `Bearer ${login.data.accessToken}`)
      .expect(400);

    expect(response.body).toMatchObject({
      error: { code: 'SUPPORT_SEARCH_QUERY_INVALID' },
    });
  });

  it('returns 404 SUPPORT_REQUEST_NOT_FOUND for an unknown support request detail id', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/internal-sessions')
      .send({
        email: 'support@handrix.local',
        password: 'support-demo-pass',
      })
      .expect(201);
    const login = asEnvelope<SessionEnvelope>(loginResponse);

    const response = await request(app.getHttpServer())
      .get('/support/requests/hrx_does_not_exist')
      .set('Authorization', `Bearer ${login.data.accessToken}`)
      .expect(404);

    expect(response.body).toMatchObject({
      error: { code: 'SUPPORT_REQUEST_NOT_FOUND' },
    });
  });

  it('rejects an ops token on /support/requests with a 403 forbidden envelope', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/internal-sessions')
      .send({
        email: 'ops@handrix.local',
        password: 'ops-demo-pass',
      })
      .expect(201);
    const login = asEnvelope<SessionEnvelope>(loginResponse);

    const response = await request(app.getHttpServer())
      .get('/support/requests?q=hrx')
      .set('Authorization', `Bearer ${login.data.accessToken}`)
      .expect(403);

    expect(response.body).toMatchObject({
      error: { code: 'INTERNAL_AUTH_FORBIDDEN' },
    });
    expect(response.body).not.toHaveProperty('data');
  });

  it('rejects an ops token on /support/requests/:publicId with a 403 forbidden envelope', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/internal-sessions')
      .send({
        email: 'ops@handrix.local',
        password: 'ops-demo-pass',
      })
      .expect(201);
    const login = asEnvelope<SessionEnvelope>(loginResponse);

    const response = await request(app.getHttpServer())
      .get('/support/requests/hrx_any_id')
      .set('Authorization', `Bearer ${login.data.accessToken}`)
      .expect(403);

    expect(response.body).toMatchObject({
      error: { code: 'INTERNAL_AUTH_FORBIDDEN' },
    });
    expect(response.body).not.toHaveProperty('data');
  });

  it('rejects an unauthenticated GET /support/requests with a 401 INTERNAL_AUTH_REQUIRED envelope', async () => {
    const response = await request(app.getHttpServer())
      .get('/support/requests?q=hrx')
      .expect(401);

    expect(response.body).toMatchObject({
      error: { code: 'INTERNAL_AUTH_REQUIRED' },
    });
    expect(response.body).not.toHaveProperty('data');
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }

    process.env = originalEnv;
  });
});
