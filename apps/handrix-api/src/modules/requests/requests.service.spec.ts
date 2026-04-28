import { mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ReferenceDataService } from '../reference-data/reference-data.service';
import { RequestStoreService } from './request-store.service';
import { RequestsService } from './requests.service';

function minutesAfter(isoTimestamp: string, minutes: number) {
  return new Date(
    new Date(isoTimestamp).getTime() + minutes * 60 * 1000,
  ).toISOString();
}

describe('RequestsService', () => {
  const testDirectory = mkdtempSync(
    join(tmpdir(), 'handrix-requests-service-'),
  );
  const storePath = join(testDirectory, 'requests.json');
  const requestStore = RequestStoreService.forFilePath(storePath);
  const prisma = requestStore.getPrismaClient();
  const referenceDataService = new ReferenceDataService();
  const service = new RequestsService(
    referenceDataService,
    requestStore,
    prisma,
  );

  it('classifies in-scope intake details as serviceable', () => {
    const result = service.evaluateIntake(
      'under-sink-leak',
      [
        { questionId: 'containedToSink', value: true },
        { questionId: 'activePooling', value: true },
      ],
      {
        addressLine1: '42 Court Street',
        city: 'Brooklyn',
        postalCode: '11215',
        unitOrAccessNote: 'Buzz 2A',
        locationDetails: 'Water under the kitchen sink',
      },
    );

    expect(result).toMatchObject({
      issueTypeId: 'under-sink-leak',
      serviceabilityStatus: 'serviceable',
      nextStep: 'continueToContainment',
    });
  });

  it('routes unsupported details to recovery', () => {
    const result = service.evaluateIntake(
      'clogged-toilet',
      [
        { questionId: 'singleToiletAffected', value: false },
        { questionId: 'backupBeyondToilet', value: true },
      ],
      {
        addressLine1: '42 Court Street',
        city: 'Brooklyn',
        postalCode: '11215',
        unitOrAccessNote: '',
        locationDetails: '',
      },
    );

    expect(result.serviceabilityStatus).toBe('needsRecovery');
    expect(result.recoveryCode).toBe('UNSUPPORTED_REQUEST_DETAILS');
    expect(result.nextStep).toBe('showRecoveryPath');
  });

  it('routes out-of-area addresses to recovery', () => {
    const result = service.evaluateIntake(
      'dripping-faucet',
      [
        { questionId: 'singleFixture', value: true },
        { questionId: 'shutoffAccessible', value: true },
      ],
      {
        addressLine1: '77 Main Street',
        city: 'Newark',
        postalCode: '07102',
        unitOrAccessNote: '',
        locationDetails: '',
      },
    );

    expect(result.serviceabilityStatus).toBe('outOfArea');
    expect(result.recoveryCode).toBe('OUT_OF_SERVICE_AREA');
    expect(result.nextStep).toBe('showRecoveryPath');
  });

  it('delegates intake scope and coverage evaluation to the reference-data service', () => {
    const evaluateIntakeDecisionSpy = jest.spyOn(
      referenceDataService,
      'evaluateIntakeDecision',
    );

    service.evaluateIntake(
      'slow-drain',
      [
        { questionId: 'singleDrainAffected', value: true },
        { questionId: 'standingWater', value: true },
      ],
      {
        addressLine1: '15 Spring Street',
        city: 'New York',
        postalCode: '10011',
        unitOrAccessNote: '',
        locationDetails: 'Bathroom sink on the second floor',
      },
    );

    expect(evaluateIntakeDecisionSpy).toHaveBeenCalledWith(
      'slow-drain',
      [
        { questionId: 'singleDrainAffected', value: true },
        { questionId: 'standingWater', value: true },
      ],
      expect.objectContaining({
        postalCode: '10011',
      }),
    );
  });

  it('builds a pre-confirmation request review summary from intake details', () => {
    const result = service.createRequestReviewSummary({
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

    expect(result).toMatchObject({
      issueTypeId: 'slow-drain',
      issueLabel: 'Slow drain',
      confirmationLabel: 'Confirm request',
      eta: {
        value: 'Usually within 2 to 4 hours',
      },
      pricing: {
        value: 'Most visits start with an $89 to $139 assessment',
      },
    });
    expect(result?.sections[0].items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Selected issue',
          value: 'Slow drain',
        }),
        expect.objectContaining({
          label: 'Is only one drain running slowly?',
          value: 'Yes',
        }),
      ]),
    );
  });

  it('does not build a request review summary for recovery paths', () => {
    const result = service.createRequestReviewSummary({
      issueTypeId: 'clogged-toilet',
      answers: [
        { questionId: 'singleToiletAffected', value: false },
        { questionId: 'backupBeyondToilet', value: true },
      ],
      serviceLocation: {
        addressLine1: '88 Atlantic Avenue',
        city: 'Brooklyn',
        postalCode: '11201',
        unitOrAccessNote: '',
        locationDetails: '',
      },
      classification: {
        issueTypeId: 'clogged-toilet',
        serviceabilityStatus: 'needsRecovery',
        nextStep: 'showRecoveryPath',
        summaryHeadline:
          'This request needs a recovery path instead of the standard flow.',
        summaryDetail:
          'Based on the details you shared, this looks broader than the small-plumbing cases Handrix handles in the MVP.',
        recoveryCode: 'UNSUPPORTED_REQUEST_DETAILS',
      },
    });

    expect(result).toBeNull();
  });

  it('creates an anonymous request with a tracking credential and initial lifecycle state', async () => {
    const result = await service.createAnonymousRequest({
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
      idempotencyKey: 'review-submit-1',
    });

    expect(result.publicId).toMatch(/^hrx_/);
    expect(result.publicStatus).toBe('received');
    expect(result.publicStatusLabel).toBe('Request received');
    expect(result.publicStatusDetail).toContain(
      'reviewing your issue details and service location',
    );
    expect(result.trackingCredential.token).toContain('.');

    const persistedRequest = (await requestStore.listRequests()).find(
      (entry) => entry.idempotencyKey === 'review-submit-1',
    );

    expect(persistedRequest?.history).toHaveLength(1);
    expect(persistedRequest?.history[0]).toMatchObject({
      previousLifecycleState: null,
      nextLifecycleState: 'intake_in_review',
      previousPublicStatus: null,
      nextPublicStatus: 'received',
      actorType: 'system',
      changeSummary:
        'Customer confirmed the anonymous request through the guided review flow.',
    });
    expect(
      persistedRequest?.history[0]?.customerSnapshot.publicStatusLabel,
    ).toBe('Request received');
    expect(persistedRequest?.history[0]?.customerSnapshot.nextStepDetail).toBe(
      'Handrix is reviewing your request details and service location before the next update.',
    );
  });

  it('returns the same request for repeated submissions with the same idempotency key', async () => {
    const request = {
      issueTypeId: 'under-sink-leak' as const,
      answers: [
        { questionId: 'containedToSink', value: true },
        { questionId: 'activePooling', value: true },
      ],
      serviceLocation: {
        addressLine1: '42 Court Street',
        city: 'Brooklyn',
        postalCode: '11215',
        unitOrAccessNote: 'Buzz 2A',
        locationDetails: 'Water under the kitchen sink',
      },
      classification: {
        issueTypeId: 'under-sink-leak' as const,
        serviceabilityStatus: 'serviceable' as const,
        nextStep: 'continueToContainment' as const,
        summaryHeadline:
          'This request can keep moving through the guided flow.',
        summaryDetail:
          'You are still within the supported plumbing scope and service area for the next Handrix step.',
      },
      idempotencyKey: 'review-submit-repeat',
    };

    const first = await service.createAnonymousRequest(request);
    const second = await service.createAnonymousRequest(request);

    expect(second.publicId).toBe(first.publicId);
    expect(second.trackingCredential.token).toBe(
      first.trackingCredential.token,
    );
  });

  it('derives confirmation status messaging from the persisted public status', async () => {
    const request = {
      issueTypeId: 'under-sink-leak' as const,
      answers: [
        { questionId: 'containedToSink', value: true },
        { questionId: 'activePooling', value: true },
      ],
      serviceLocation: {
        addressLine1: '42 Court Street',
        city: 'Brooklyn',
        postalCode: '11215',
        unitOrAccessNote: 'Buzz 2A',
        locationDetails: 'Water under the kitchen sink',
      },
      classification: {
        issueTypeId: 'under-sink-leak' as const,
        serviceabilityStatus: 'serviceable' as const,
        nextStep: 'continueToContainment' as const,
        summaryHeadline:
          'This request can keep moving through the guided flow.',
        summaryDetail:
          'You are still within the supported plumbing scope and service area for the next Handrix step.',
      },
      idempotencyKey: 'review-submit-derived-status',
    };

    await service.createAnonymousRequest(request);

    const persistedRequest = (await requestStore.listRequests()).find(
      (entry) => entry.idempotencyKey === request.idempotencyKey,
    );

    expect(persistedRequest).toBeDefined();

    await prisma.serviceRequest.update({
      where: {
        publicId: persistedRequest!.publicId,
      },
      data: {
        lifecycleState: 'dispatch_in_progress',
        publicStatus: 'dispatching',
      },
    });

    const replayed = await service.createAnonymousRequest(request);

    expect(replayed.publicStatus).toBe('dispatching');
    expect(replayed.publicStatusLabel).toBe('Dispatch in progress');
    expect(replayed.publicStatusDetail).toContain(
      'A Handrix team member is actively moving this request forward',
    );
  });

  it('rejects persisted requests that mix contradictory lifecycle and public status values', async () => {
    const request = {
      issueTypeId: 'under-sink-leak' as const,
      answers: [
        { questionId: 'containedToSink', value: true },
        { questionId: 'activePooling', value: true },
      ],
      serviceLocation: {
        addressLine1: '42 Court Street',
        city: 'Brooklyn',
        postalCode: '11215',
        unitOrAccessNote: 'Buzz 2A',
        locationDetails: 'Water under the kitchen sink',
      },
      classification: {
        issueTypeId: 'under-sink-leak' as const,
        serviceabilityStatus: 'serviceable' as const,
        nextStep: 'continueToContainment' as const,
        summaryHeadline:
          'This request can keep moving through the guided flow.',
        summaryDetail:
          'You are still within the supported plumbing scope and service area for the next Handrix step.',
      },
      idempotencyKey: 'review-submit-invalid-status-combination',
    };

    await service.createAnonymousRequest(request);

    const persistedRequest = (await requestStore.listRequests()).find(
      (entry) => entry.idempotencyKey === request.idempotencyKey,
    );

    expect(persistedRequest).toBeDefined();

    await prisma.serviceRequest.update({
      where: {
        publicId: persistedRequest!.publicId,
      },
      data: {
        lifecycleState: 'dispatch_in_progress',
        publicStatus: 'received',
      },
    });

    await expect(service.createAnonymousRequest(request)).rejects.toThrow(
      'Unsupported public status "received" for lifecycle state "dispatch_in_progress".',
    );
  });

  it('returns the current customer-safe request status for a valid tracking credential', async () => {
    const createdRequest = await service.createAnonymousRequest({
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
      idempotencyKey: 'review-status-lookup-success',
    });

    const dispatchStartedAt = minutesAfter(createdRequest.createdAt, 15);

    const appendedHistoryRequest = await requestStore.appendHistoryEntry({
      publicId: createdRequest.publicId,
      lifecycleState: 'dispatch_in_progress',
      publicStatus: 'dispatching',
      createdAt: dispatchStartedAt,
      note: 'A Handrix team member is now coordinating the dispatch step.',
    });

    expect(appendedHistoryRequest).not.toBeNull();
    expect(appendedHistoryRequest?.history.at(-1)).toMatchObject({
      nextPublicStatus: 'dispatching',
    });

    expect(
      (await requestStore.getByPublicId(createdRequest.publicId))?.history.at(
        -1,
      ),
    ).toMatchObject({
      nextPublicStatus: 'dispatching',
    });

    const requestStatus = await service.getRequestStatus({
      publicId: createdRequest.publicId,
      trackingToken: createdRequest.trackingCredential.token,
    });

    expect(requestStatus).toMatchObject({
      publicId: createdRequest.publicId,
      issueLabel: 'Slow drain',
      publicStatus: 'dispatching',
      publicStatusLabel: 'Dispatch in progress',
      latestChangeSummary:
        'A Handrix team member is now coordinating the dispatch step.',
    });
    expect(requestStatus.nextStepDetail).toContain(
      'actively moving this request forward',
    );
    expect(requestStatus.updatedAt).toBe(dispatchStartedAt);
    expect(requestStatus.timeline).toEqual([
      expect.objectContaining({
        publicStatus: 'received',
        publicStatusLabel: 'Request received',
        isCurrent: false,
      }),
      expect.objectContaining({
        publicStatus: 'dispatching',
        publicStatusLabel: 'Dispatch in progress',
        changeSummary:
          'A Handrix team member is now coordinating the dispatch step.',
        isCurrent: true,
      }),
    ]);
    expect(requestStatus.history).toEqual([
      expect.objectContaining({
        previousPublicStatus: null,
        publicStatus: 'received',
        nextStepDetail:
          'Handrix is reviewing your request details and service location before the next update.',
        recoveryState: null,
      }),
      expect.objectContaining({
        previousPublicStatus: 'received',
        publicStatus: 'dispatching',
        changeSummary:
          'A Handrix team member is now coordinating the dispatch step.',
        nextStepDetail:
          'Handrix is actively moving this request forward and will share the next service update as progress changes.',
      }),
    ]);
    expect(requestStatus.recoveryState).toBeNull();
  });

  it('returns a dedicated clarification recovery state for tracked requests that need more detail', async () => {
    const createdRequest = await service.createAnonymousRequest({
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
      idempotencyKey: 'review-status-lookup-clarification',
    });

    await requestStore.appendHistoryEntry({
      publicId: createdRequest.publicId,
      lifecycleState: 'clarification_needed',
      publicStatus: 'needsClarification',
      createdAt: minutesAfter(createdRequest.createdAt, 10),
      note: 'We need one more confirmation about fixture access before dispatch can continue.',
    });

    const requestStatus = await service.getRequestStatus({
      publicId: createdRequest.publicId,
      trackingToken: createdRequest.trackingCredential.token,
    });

    expect(requestStatus.publicStatus).toBe('needsClarification');
    expect(requestStatus.recoveryState).toEqual(
      expect.objectContaining({
        kind: 'clarification',
        nextActionLabel: 'Confirm the missing detail',
      }),
    );
    expect(requestStatus.nextStepDetail).toContain(
      'needs one more clarification',
    );
  });

  it('returns a dedicated delayed recovery state instead of overloading dispatching', async () => {
    const createdRequest = await service.createAnonymousRequest({
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
      idempotencyKey: 'review-status-lookup-delayed',
    });

    const dispatchStartedAt = minutesAfter(createdRequest.createdAt, 10);

    await requestStore.appendHistoryEntry({
      publicId: createdRequest.publicId,
      lifecycleState: 'dispatch_in_progress',
      publicStatus: 'dispatching',
      createdAt: dispatchStartedAt,
      note: 'Dispatch coordination has started for this request.',
    });

    await requestStore.appendHistoryEntry({
      publicId: createdRequest.publicId,
      lifecycleState: 'dispatch_delayed',
      publicStatus: 'delayed',
      createdAt: minutesAfter(dispatchStartedAt, 25),
      note: 'Arrival timing is taking longer than first expected while the route is rechecked.',
    });

    const requestStatus = await service.getRequestStatus({
      publicId: createdRequest.publicId,
      trackingToken: createdRequest.trackingCredential.token,
    });

    expect(requestStatus.publicStatus).toBe('delayed');
    expect(requestStatus.publicStatusLabel).toBe('Dispatch delayed');
    expect(requestStatus.recoveryState).toEqual(
      expect.objectContaining({
        kind: 'delay',
        title: 'This request is still moving, but the timing has changed.',
      }),
    );
    expect(requestStatus.timeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          publicStatus: 'dispatching',
          isCurrent: false,
        }),
        expect.objectContaining({
          publicStatus: 'delayed',
          isCurrent: true,
        }),
      ]),
    );
    expect(requestStatus.history.at(-1)?.previousPublicStatus).toBe(
      'dispatching',
    );
    expect(requestStatus.history.at(-1)?.publicStatus).toBe('delayed');
    expect(requestStatus.history.at(-1)?.recoveryState?.kind).toBe('delay');
  });

  it('returns ordered customer-safe history from persisted transitions without breaking tracking', async () => {
    const createdRequest = await service.createAnonymousRequest({
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
      idempotencyKey: 'review-status-lookup-legacy-history',
    });

    await requestStore.appendHistoryEntry({
      publicId: createdRequest.publicId,
      lifecycleState: 'dispatch_delayed',
      publicStatus: 'delayed',
      createdAt: minutesAfter(createdRequest.createdAt, 25),
      note: 'Arrival timing is taking longer than first expected while the route is rechecked.',
    });

    const requestStatus = await service.getRequestStatus({
      publicId: createdRequest.publicId,
      trackingToken: createdRequest.trackingCredential.token,
    });

    expect(requestStatus.history).toHaveLength(2);
    expect(requestStatus.history[0]).toMatchObject({
      previousPublicStatus: null,
      publicStatus: 'received',
    });
    expect(requestStatus.history[1]).toMatchObject({
      previousPublicStatus: 'received',
      publicStatus: 'delayed',
    });
    expect(requestStatus.history[1]?.recoveryState?.kind).toBe('delay');
    expect(requestStatus.timeline.at(-1)).toEqual(
      expect.objectContaining({
        publicStatus: 'delayed',
        isCurrent: true,
      }),
    );
  });

  it('returns fallback guidance for unavailable tracked requests', async () => {
    const createdRequest = await service.createAnonymousRequest({
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
      idempotencyKey: 'review-status-lookup-unavailable',
    });

    await requestStore.appendHistoryEntry({
      publicId: createdRequest.publicId,
      lifecycleState: 'unfulfilled',
      publicStatus: 'unavailable',
      createdAt: minutesAfter(createdRequest.createdAt, 35),
      note: 'This service path is no longer available for the current request details.',
    });

    const requestStatus = await service.getRequestStatus({
      publicId: createdRequest.publicId,
      trackingToken: createdRequest.trackingCredential.token,
    });

    expect(requestStatus.publicStatus).toBe('unavailable');
    expect(requestStatus.recoveryState).toEqual(
      expect.objectContaining({
        kind: 'unavailable',
      }),
    );
    expect(requestStatus.recoveryState?.fallbackGuidance).toContain(
      'Review the fallback path carefully',
    );
  });

  it('rejects request-status lookup when the tracking token targets a different request', async () => {
    const first = await service.createAnonymousRequest({
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
      idempotencyKey: 'review-status-lookup-first',
    });
    const second = await service.createAnonymousRequest({
      issueTypeId: 'under-sink-leak',
      answers: [
        { questionId: 'containedToSink', value: true },
        { questionId: 'activePooling', value: true },
      ],
      serviceLocation: {
        addressLine1: '42 Court Street',
        city: 'Brooklyn',
        postalCode: '11215',
        unitOrAccessNote: 'Buzz 2A',
        locationDetails: 'Water under the kitchen sink',
      },
      classification: {
        issueTypeId: 'under-sink-leak',
        serviceabilityStatus: 'serviceable',
        nextStep: 'continueToContainment',
        summaryHeadline:
          'This request can keep moving through the guided flow.',
        summaryDetail:
          'You are still within the supported plumbing scope and service area for the next Handrix step.',
      },
      idempotencyKey: 'review-status-lookup-second',
    });

    await expect(
      service.getRequestStatus({
        publicId: first.publicId,
        trackingToken: second.trackingCredential.token,
      }),
    ).rejects.toThrow('This request status is not available right now.');
  });

  it('rejects request-status lookup when the tracking token is tampered with', async () => {
    const createdRequest = await service.createAnonymousRequest({
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
      idempotencyKey: 'review-status-lookup-tampered',
    });

    await expect(
      service.getRequestStatus({
        publicId: createdRequest.publicId,
        trackingToken: `${createdRequest.trackingCredential.token}tampered`,
      }),
    ).rejects.toThrow('This request status is not available right now.');
  });

  afterAll(async () => {
    await rm(testDirectory, { recursive: true, force: true });
  });
});
