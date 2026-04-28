import { BadRequestException } from '@nestjs/common';
import { mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RequestsController } from './requests.controller';
import { RequestStoreService } from './request-store.service';
import { RequestsService } from './requests.service';
import { ReferenceDataService } from '../reference-data/reference-data.service';

function minutesAfter(isoTimestamp: string, minutes: number) {
  return new Date(
    new Date(isoTimestamp).getTime() + minutes * 60 * 1000,
  ).toISOString();
}

describe('RequestsController', () => {
  const testDirectory = mkdtempSync(
    join(tmpdir(), 'handrix-requests-controller-'),
  );
  let controllerCounter = 0;

  function buildController() {
    const { controller } = buildControllerWithStore();
    return controller;
  }

  function buildControllerWithStore() {
    controllerCounter += 1;

    const store = RequestStoreService.forFilePath(
      join(testDirectory, `controller-${controllerCounter}.json`),
    );
    const prisma = store.getPrismaClient();

    const controller = new RequestsController(
      new RequestsService(new ReferenceDataService(), store, prisma),
    );

    return { controller, store, prisma };
  }

  it('returns a serviceable intake evaluation when the request stays in scope', () => {
    const controller = buildController();
    const response = controller.createIntakeEvaluation({
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
    });

    expect(response.data.serviceabilityStatus).toBe('serviceable');
    expect(response.data.nextStep).toBe('continueToContainment');
  });

  it('returns a request review summary for a serviceable request', () => {
    const controller = buildController();
    const response = controller.createRequestReviewSummary({
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

    expect(response.data.issueTypeId).toBe('slow-drain');
    expect(response.data.eta.value).toBe('Usually within 2 to 4 hours');
    expect(response.data.pricing.value).toBe(
      'Most visits start with an $89 to $139 assessment',
    );
  });

  it('creates an anonymous request and returns a customer-safe tracking identity', async () => {
    const controller = buildController();
    const response = await controller.createRequest({
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
      idempotencyKey: 'controller-submit-1',
    });

    expect(response.data.publicId).toMatch(/^hrx_/);
    expect(response.data.publicStatus).toBe('received');
    expect(response.data.publicStatusLabel).toBe('Request received');
    expect(response.data).not.toHaveProperty('lifecycleState');
    expect(response.data.trackingCredential.token).toContain('.');
  });

  it('returns a customer-safe tracked request status for a valid tracking identity', async () => {
    const controller = buildController();
    const createdRequest = await controller.createRequest({
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
      idempotencyKey: 'controller-status-lookup-1',
    });

    const response = await controller.createRequestStatusLookup({
      publicId: createdRequest.data.publicId,
      trackingToken: createdRequest.data.trackingCredential.token,
    });

    expect(response.data.publicId).toBe(createdRequest.data.publicId);
    expect(response.data.issueLabel).toBe('Slow drain');
    expect(response.data.publicStatusLabel).toBe('Request received');
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
        nextStepDetail:
          'Handrix is reviewing your request details and service location before the next update.',
      }),
    ]);
    expect(response.data.recoveryState).toBeNull();
    expect(response.data).not.toHaveProperty('lifecycleState');
    expect(response.data.history[0]).not.toHaveProperty('actorType');
  });

  it('returns recovery-state details for delayed tracked requests without leaking lifecycle internals', async () => {
    const store = RequestStoreService.forFilePath(
      join(testDirectory, 'controller-recovery.json'),
    );
    const controller = new RequestsController(
      new RequestsService(
        new ReferenceDataService(),
        store,
        store.getPrismaClient(),
      ),
    );
    const createdRequest = await controller.createRequest({
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
      idempotencyKey: 'controller-status-lookup-delayed',
    });

    await store.appendHistoryEntry({
      publicId: createdRequest.data.publicId,
      lifecycleState: 'dispatch_delayed',
      publicStatus: 'delayed',
      createdAt: minutesAfter(createdRequest.data.createdAt, 10),
      note: 'Arrival timing is taking longer than first expected while the route is rechecked.',
    });

    const response = await controller.createRequestStatusLookup({
      publicId: createdRequest.data.publicId,
      trackingToken: createdRequest.data.trackingCredential.token,
    });

    expect(response.data.publicStatus).toBe('delayed');
    expect(response.data.recoveryState).toEqual(
      expect.objectContaining({
        kind: 'delay',
      }),
    );
    expect(response.data).not.toHaveProperty('lifecycleState');
  });

  it('rejects invalid tracking identities without leaking request details', async () => {
    const controller = buildController();
    const createdRequest = await controller.createRequest({
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
      idempotencyKey: 'controller-status-lookup-2',
    });

    await expect(
      controller.createRequestStatusLookup({
        publicId: createdRequest.data.publicId,
        trackingToken: 'not-a-valid-token',
      }),
    ).rejects.toMatchObject({
      response: {
        error: {
          code: 'REQUEST_STATUS_LOOKUP_REJECTED',
          message: 'We could not open that request status right now.',
        },
      },
    });
  });

  it('returns the shared error envelope when intake evaluation input is invalid', () => {
    const controller = buildController();

    expect(() =>
      controller.createIntakeEvaluation({
        issueTypeId: '',
        answers: [],
        serviceLocation: {},
      }),
    ).toThrow(BadRequestException);

    try {
      controller.createIntakeEvaluation({
        issueTypeId: '',
        answers: [],
        serviceLocation: {},
      });
    } catch (error) {
      expect((error as BadRequestException).getResponse()).toMatchObject({
        error: {
          code: 'REQUEST_INTAKE_EVALUATION_VALIDATION_FAILED',
        },
      });
    }
  });

  it('returns the shared error envelope when request review input is invalid', () => {
    const controller = buildController();

    expect(() =>
      controller.createRequestReviewSummary({
        issueTypeId: '',
      }),
    ).toThrow(BadRequestException);

    try {
      controller.createRequestReviewSummary({
        issueTypeId: '',
      });
    } catch (error) {
      expect((error as BadRequestException).getResponse()).toMatchObject({
        error: {
          code: 'REQUEST_REVIEW_SUMMARY_VALIDATION_FAILED',
        },
      });
    }
  });

  it('accepts a flow.started ingestion event', async () => {
    const controller = buildController();

    const response = await controller.createPublicEvent({
      eventName: 'flow.started',
      metadata: { surface: 'web' },
    });

    expect(response.data).toEqual({ accepted: true });
    expect(response.meta?.generatedAt).toEqual(expect.any(String));
  });

  it('rejects an unknown public event name', async () => {
    const controller = buildController();

    await expect(
      controller.createPublicEvent({ eventName: 'something.else' }),
    ).rejects.toMatchObject({
      response: {
        error: {
          code: 'REQUEST_EVENT_INGESTION_VALIDATION_FAILED',
        },
      },
    });
  });

  it('rejects feedback submission when the request has not yet resolved', async () => {
    const { controller } = buildControllerWithStore();
    const createdRequest = await controller.createRequest({
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
      idempotencyKey: 'controller-feedback-not-ready',
    });

    await expect(
      controller.submitFeedback(
        createdRequest.data.publicId,
        createdRequest.data.trackingCredential.token,
        { satisfactionRating: 4 },
      ),
    ).rejects.toMatchObject({
      response: {
        error: {
          code: 'REQUEST_FEEDBACK_NOT_READY',
        },
      },
    });
  });

  it('records feedback once a request is resolved', async () => {
    const { controller, store, prisma } = buildControllerWithStore();
    const createdRequest = await controller.createRequest({
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
      idempotencyKey: 'controller-feedback-happy-path',
    });

    await store.transitionRequestLifecycle({
      publicId: createdRequest.data.publicId,
      lifecycleState: 'completed',
      publicStatus: 'completed',
      occurredAt: new Date(
        new Date(createdRequest.data.createdAt).getTime() + 60 * 60 * 1000,
      ).toISOString(),
      note: 'Fulfillment complete.',
    });

    const response = await controller.submitFeedback(
      createdRequest.data.publicId,
      createdRequest.data.trackingCredential.token,
      { satisfactionRating: 5, reducedUncertainty: true },
    );

    expect(response.data.satisfactionRating).toBe(5);
    expect(response.data.acknowledgement).toContain('Thank you');

    const stored = await prisma.requestFeedback.findFirst({
      where: {
        request: { publicId: createdRequest.data.publicId },
      },
    });

    expect(stored).toMatchObject({
      satisfactionRating: 5,
      reducedUncertainty: true,
    });
  });

  it('rejects feedback when the tracking token is missing', async () => {
    const { controller } = buildControllerWithStore();

    await expect(
      controller.submitFeedback('hrx_missing', undefined, {
        satisfactionRating: 3,
      }),
    ).rejects.toMatchObject({
      response: {
        error: {
          code: 'REQUEST_FEEDBACK_UNAUTHORIZED',
        },
      },
    });
  });

  it('rejects duplicate feedback submission with a conflict error', async () => {
    const { controller, store } = buildControllerWithStore();
    const createdRequest = await controller.createRequest({
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
      idempotencyKey: 'controller-feedback-duplicate',
    });

    await store.transitionRequestLifecycle({
      publicId: createdRequest.data.publicId,
      lifecycleState: 'completed',
      publicStatus: 'completed',
      occurredAt: new Date(
        new Date(createdRequest.data.createdAt).getTime() + 60 * 60 * 1000,
      ).toISOString(),
      note: 'Fulfillment complete.',
    });

    await controller.submitFeedback(
      createdRequest.data.publicId,
      createdRequest.data.trackingCredential.token,
      { satisfactionRating: 4 },
    );

    await expect(
      controller.submitFeedback(
        createdRequest.data.publicId,
        createdRequest.data.trackingCredential.token,
        { satisfactionRating: 2 },
      ),
    ).rejects.toMatchObject({
      response: {
        error: {
          code: 'REQUEST_FEEDBACK_ALREADY_SUBMITTED',
        },
      },
    });
  });

  it('rejects feedback submission when the satisfactionRating is out of range', async () => {
    const { controller, store } = buildControllerWithStore();
    const createdRequest = await controller.createRequest({
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
      idempotencyKey: 'controller-feedback-validation',
    });

    await store.transitionRequestLifecycle({
      publicId: createdRequest.data.publicId,
      lifecycleState: 'completed',
      publicStatus: 'completed',
      occurredAt: new Date(
        new Date(createdRequest.data.createdAt).getTime() + 60 * 60 * 1000,
      ).toISOString(),
      note: 'Fulfillment complete.',
    });

    await expect(
      controller.submitFeedback(
        createdRequest.data.publicId,
        createdRequest.data.trackingCredential.token,
        { satisfactionRating: 9 },
      ),
    ).rejects.toMatchObject({
      response: {
        error: {
          code: 'REQUEST_FEEDBACK_VALIDATION_FAILED',
        },
      },
    });
  });

  afterAll(async () => {
    await rm(testDirectory, { recursive: true, force: true });
  });
});
