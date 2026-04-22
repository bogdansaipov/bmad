import { mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createPersistedHistoryEntry,
  RequestStoreService,
  type PersistedServiceRequest,
  type RequestLifecycleState,
} from '../requests/request-store.service';
import { ReferenceDataService } from '../reference-data/reference-data.service';
import { OpsService } from './ops.service';

jest.setTimeout(20000);

function buildPersistedRequest(input: {
  publicId: string;
  idempotencyKey: string;
  issueLabel: string;
  lifecycleState: RequestLifecycleState;
  publicStatus:
    | 'received'
    | 'inReview'
    | 'dispatching'
    | 'delayed'
    | 'needsClarification'
    | 'completed'
    | 'unavailable';
  createdAt: string;
  updatedAt: string;
  note: string;
  customerContext?: PersistedServiceRequest['customerContext'];
  assignment?: PersistedServiceRequest['assignment'];
}): PersistedServiceRequest {
  return {
    internalId: `internal-${input.publicId}`,
    publicId: input.publicId,
    idempotencyKey: input.idempotencyKey,
    requestFingerprint: `fingerprint-${input.idempotencyKey}`,
    issueTypeId: 'slow-drain',
    issueLabel: input.issueLabel,
    answers: [
      { questionId: 'singleDrainAffected', value: true },
      { questionId: 'standingWater', value: true },
    ],
    serviceLocation: {
      addressLine1: '15 Spring Street',
      city: 'New York',
      postalCode: '10011',
      unitOrAccessNote: '',
      locationDetails: '',
    },
    classification: {
      issueTypeId: 'slow-drain',
      serviceabilityStatus: 'serviceable',
      nextStep: 'continueToContainment',
      summaryHeadline: 'This request can keep moving through the guided flow.',
      summaryDetail:
        'You are still within the supported plumbing scope and service area for the next Handrix step.',
    },
    lifecycleState: input.lifecycleState,
    publicStatus: input.publicStatus,
    createdAt: input.createdAt,
    trackingCredential: {
      token: `${input.publicId}.signed.token`,
      expiresAt: '2026-05-20T08:00:00.000Z',
    },
    assignment: input.assignment,
    customerContext: input.customerContext,
    history: [
      createPersistedHistoryEntry({
        previousLifecycleState: null,
        nextLifecycleState: input.lifecycleState,
        previousPublicStatus: null,
        nextPublicStatus: input.publicStatus,
        occurredAt: input.updatedAt,
        changeSummary: input.note,
      }),
    ],
  };
}

describe('OpsService', () => {
  const testDirectory = mkdtempSync(join(tmpdir(), 'handrix-ops-service-'));

  afterAll(async () => {
    await rm(testDirectory, { recursive: true, force: true });
  });

  it('maps active request records into a triage queue and excludes completed work', async () => {
    const store = RequestStoreService.forFilePath(
      join(testDirectory, 'queue.json'),
    );
    const service = new OpsService(store, new ReferenceDataService());

    await store.createOrGetByIdempotencyKey(
      buildPersistedRequest({
        publicId: 'hrx_new',
        idempotencyKey: 'ops-queue-new',
        issueLabel: 'Slow drain',
        lifecycleState: 'intake_in_review',
        publicStatus: 'received',
        createdAt: '2026-04-20T08:00:00.000Z',
        updatedAt: '2026-04-20T08:00:00.000Z',
        note: 'Customer confirmed the anonymous request through the guided review flow.',
      }),
    );
    await store.createOrGetByIdempotencyKey(
      buildPersistedRequest({
        publicId: 'hrx_assignable',
        idempotencyKey: 'ops-queue-assignable',
        issueLabel: 'Leak under sink',
        lifecycleState: 'intake_in_review',
        publicStatus: 'inReview',
        createdAt: '2026-04-20T08:03:00.000Z',
        updatedAt: '2026-04-20T08:06:00.000Z',
        note: 'The intake details are ready for the next dispatch decision.',
      }),
    );
    await store.createOrGetByIdempotencyKey(
      buildPersistedRequest({
        publicId: 'hrx_clarification',
        idempotencyKey: 'ops-queue-clarification',
        issueLabel: 'Clogged toilet',
        lifecycleState: 'clarification_needed',
        publicStatus: 'needsClarification',
        createdAt: '2026-04-20T08:02:00.000Z',
        updatedAt: '2026-04-20T08:15:00.000Z',
        note: 'The coordinator needs one more customer detail before dispatch.',
      }),
    );
    await store.createOrGetByIdempotencyKey(
      buildPersistedRequest({
        publicId: 'hrx_blocked',
        idempotencyKey: 'ops-queue-blocked',
        issueLabel: 'Dripping faucet',
        lifecycleState: 'dispatch_delayed',
        publicStatus: 'delayed',
        createdAt: '2026-04-20T08:01:00.000Z',
        updatedAt: '2026-04-20T08:20:00.000Z',
        note: 'Arrival timing is taking longer than first expected while the route is rechecked.',
      }),
    );
    await store.createOrGetByIdempotencyKey(
      buildPersistedRequest({
        publicId: 'hrx_assigned',
        idempotencyKey: 'ops-queue-assigned',
        issueLabel: 'Under-sink leak',
        lifecycleState: 'dispatch_in_progress',
        publicStatus: 'dispatching',
        createdAt: '2026-04-20T08:04:00.000Z',
        updatedAt: '2026-04-20T08:12:00.000Z',
        note: 'A Handrix team member is now coordinating the dispatch step.',
        assignment: {
          ownerType: 'provider',
          ownerId: 'provider_northstar',
          ownerLabel: 'Northstar Plumbing Co.',
          assignedAt: '2026-04-20T08:12:00.000Z',
        },
      }),
    );
    await store.createOrGetByIdempotencyKey(
      buildPersistedRequest({
        publicId: 'hrx_unavailable',
        idempotencyKey: 'ops-queue-unavailable',
        issueLabel: 'Overflowing toilet',
        lifecycleState: 'unfulfilled',
        publicStatus: 'unavailable',
        createdAt: '2026-04-20T08:05:00.000Z',
        updatedAt: '2026-04-20T08:25:00.000Z',
        note: 'No current fulfillment path is available for this request.',
      }),
    );
    await store.createOrGetByIdempotencyKey(
      buildPersistedRequest({
        publicId: 'hrx_completed',
        idempotencyKey: 'ops-queue-completed',
        issueLabel: 'Slow drain',
        lifecycleState: 'completed',
        publicStatus: 'completed',
        createdAt: '2026-04-20T08:06:00.000Z',
        updatedAt: '2026-04-20T08:30:00.000Z',
        note: 'The request has been completed successfully.',
      }),
    );

    const queue = await service.getQueue();

    expect(queue.items.map((item) => item.publicId)).toEqual([
      'hrx_new',
      'hrx_clarification',
      'hrx_assignable',
      'hrx_blocked',
      'hrx_assigned',
      'hrx_unavailable',
    ]);
    expect(queue.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          publicId: 'hrx_new',
          queueState: 'new',
          queueStateLabel: 'New request',
          assignmentStatusLabel: 'Unassigned',
        }),
        expect.objectContaining({
          publicId: 'hrx_assignable',
          queueState: 'assignable',
          queueStateLabel: 'Ready for assignment',
        }),
        expect.objectContaining({
          publicId: 'hrx_clarification',
          queueState: 'needsClarification',
          assignmentStatusLabel: 'Waiting for clarification',
        }),
        expect.objectContaining({
          publicId: 'hrx_blocked',
          queueState: 'blocked',
          assignmentStatusLabel: 'Blocked',
        }),
        expect.objectContaining({
          publicId: 'hrx_assigned',
          queueState: 'assigned',
          assignmentStatusLabel: 'Dispatch in progress',
          assignedOwnerLabel: 'Northstar Plumbing Co.',
        }),
        expect.objectContaining({
          publicId: 'hrx_unavailable',
          queueState: 'unavailable',
          assignmentStatusLabel: 'No assignment possible',
        }),
      ]),
    );
    expect(queue.summary).toEqual({
      totalActive: 6,
      needsAttentionCount: 4,
      assignedCount: 1,
      blockedCount: 1,
      unavailableCount: 1,
    });
    expect(
      queue.items.find((item) => item.publicId === 'hrx_clarification')
        ?.intervention,
    ).toEqual(
      expect.objectContaining({
        kind: 'clarification',
        label: 'Clarification needed',
      }),
    );
    expect(
      queue.items.find((item) => item.publicId === 'hrx_blocked')?.intervention,
    ).toEqual(
      expect.objectContaining({
        kind: 'blocker',
        label: 'Operational blocker',
      }),
    );
    expect(
      queue.items.find((item) => item.publicId === 'hrx_completed'),
    ).toBeUndefined();
    expect(typeof queue.refreshedAt).toBe('string');
  });

  it('builds a full protected request-detail view with customer-visible context', async () => {
    const store = RequestStoreService.forFilePath(
      join(testDirectory, 'request-detail.json'),
    );
    const service = new OpsService(store, new ReferenceDataService());

    await store.createOrGetByIdempotencyKey(
      buildPersistedRequest({
        publicId: 'hrx_detail',
        idempotencyKey: 'ops-request-detail',
        issueLabel: 'Slow drain',
        lifecycleState: 'clarification_needed',
        publicStatus: 'needsClarification',
        createdAt: '2026-04-20T08:00:00.000Z',
        updatedAt: '2026-04-20T08:10:00.000Z',
        note: 'The coordinator needs one more customer detail before dispatch.',
        customerContext: {
          shownContainmentGuidance: {
            issueTypeId: 'slow-drain',
            serviceabilityStatus: 'serviceable',
            nextStep: 'continueToContainment',
            variant: 'informational',
            headline:
              'Keep the drain contained while we prepare the next step.',
            intro:
              'A contained drain issue is usually manageable for the moment when water use stays limited.',
            steps: [
              {
                title: 'Pause water use',
                detail:
                  'Avoid using the affected drain until the next step is complete.',
              },
            ],
            warnings: [],
            reassurance: 'You are taking the right first step.',
            nextActionLabel: 'Continue to request review',
            nextActionHint:
              'Next, we will summarize timing, pricing expectations, and your request details.',
          },
          shownRequestReviewSummary: {
            issueTypeId: 'slow-drain',
            issueLabel: 'Slow drain',
            headline: 'Review the request details before you confirm.',
            intro: 'This is a quick final check of what we will submit.',
            sections: [
              {
                title: 'Issue details',
                editTarget: 'issueDetails',
                editLabel: 'Edit issue details',
                items: [{ label: 'Selected issue', value: 'Slow drain' }],
              },
              {
                title: 'Service location',
                editTarget: 'serviceLocation',
                editLabel: 'Edit service location',
                items: [{ label: 'Street address', value: '15 Spring Street' }],
              },
            ],
            eta: {
              label: 'Estimated response window',
              value: 'Usually within 2 to 4 hours',
              detail:
                'Single-drain slowdowns are usually manageable for a short period.',
            },
            pricing: {
              label: 'Pricing expectation',
              value: 'Most visits start with an $89 to $139 assessment',
              detail: 'Any added work is confirmed before you approve it.',
            },
            nextSteps: {
              title: 'What happens next',
              detail:
                'After confirmation, Handrix creates the request and moves it into review.',
              bullets: [
                'Your issue details and service location are packaged into the request.',
              ],
            },
            confirmationLabel: 'Confirm request',
            confirmationHint:
              'You can still go back to edit the details above before you confirm.',
          },
        },
      }),
    );

    await store.appendHistoryEntry({
      publicId: 'hrx_detail',
      lifecycleState: 'clarification_needed',
      publicStatus: 'needsClarification',
      createdAt: '2026-04-20T08:12:00.000Z',
      note: 'The coordinator needs one more customer detail before dispatch.',
      actorType: 'ops',
      actorId: 'ops-default-user',
    });

    const detail = await service.getRequestDetail('hrx_detail');

    expect(detail).not.toBeNull();

    if (detail === null) {
      throw new Error('Expected the ops request detail to be returned.');
    }

    expect(detail.publicId).toBe('hrx_detail');
    expect(detail.currentState.lifecycleState).toBe('clarification_needed');
    expect(detail.currentState.publicStatus).toBe('needsClarification');
    expect(detail.serviceability.serviceabilityStatus).toBe('serviceable');
    expect(detail.serviceability.dispatchReadiness).toBe('needsClarification');
    expect(detail.serviceability.scopeDecisionLabel).toBe(
      'Within supported plumbing scope',
    );
    expect(detail.serviceability.scopeDecisionDetail).toContain(
      'supported single-drain slowdown path',
    );
    expect(detail.serviceability.coverageDecisionLabel).toBe(
      'Inside active service area',
    );
    expect(detail.serviceability.coverageDecisionDetail).toContain(
      'ZIP code 10011',
    );
    expect(detail.intakeAnswers).toEqual([
      expect.objectContaining({
        questionId: 'singleDrainAffected',
        questionLabel: 'Is only one drain running slowly?',
      }),
      expect.objectContaining({
        questionId: 'standingWater',
        answerLabel: 'Yes',
      }),
    ]);
    expect(detail.customerContext.containmentGuidance?.headline).toBe(
      'Keep the drain contained while we prepare the next step.',
    );
    expect(detail.customerContext.requestReviewSummary?.issueLabel).toBe(
      'Slow drain',
    );
    expect(detail.assignment.currentAssignment).toBeNull();
    expect(detail.intervention).toEqual({
      kind: 'clarification',
      label: 'Clarification needed',
      detail: 'The coordinator needs one more customer detail before dispatch.',
      recommendedAction:
        'Confirm the missing detail, then return the request to review or resume dispatch.',
      customerImpact:
        'This request needs one more clarification before it can continue, and the next update should explain what to do.',
      latestRelevantChange: {
        occurredAt: '2026-04-20T08:12:00.000Z',
        actorType: 'ops',
        changeSummary:
          'The coordinator needs one more customer detail before dispatch.',
      },
    });
    expect(detail.assignment.availableOwners).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ownerType: 'provider',
        }),
        expect.objectContaining({
          ownerType: 'internalOwner',
        }),
      ]),
    );
    expect(detail.availableTransitions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nextLifecycleState: 'intake_in_review',
          actionLabel: 'Return to review',
          publicStatus: 'inReview',
        }),
        expect.objectContaining({
          nextLifecycleState: 'unfulfilled',
          actionLabel: 'Mark unavailable',
          publicStatus: 'unavailable',
        }),
      ]),
    );
    expect(detail.history.at(-1)).toEqual(
      expect.objectContaining({
        actorType: 'ops',
        actorId: 'ops-default-user',
        intervention: {
          kind: 'clarification',
          label: 'Clarification needed',
          detail:
            'The coordinator needs one more customer detail before dispatch.',
        },
      }),
    );
    expect(detail.history[0]?.customerSnapshot.publicStatusLabel).toEqual(
      expect.any(String),
    );
  });

  it('returns null for an unknown request detail id', async () => {
    const store = RequestStoreService.forFilePath(
      join(testDirectory, 'request-detail-missing.json'),
    );
    const service = new OpsService(store, new ReferenceDataService());

    await expect(service.getRequestDetail('hrx_missing')).resolves.toBeNull();
  });

  it('assigns an eligible request and exposes the owner consistently in detail and queue reads', async () => {
    const store = RequestStoreService.forFilePath(
      join(testDirectory, 'request-assignment.json'),
    );
    const service = new OpsService(store, new ReferenceDataService());

    await store.createOrGetByIdempotencyKey(
      buildPersistedRequest({
        publicId: 'hrx_assign_now',
        idempotencyKey: 'ops-assign-now',
        issueLabel: 'Slow drain',
        lifecycleState: 'intake_in_review',
        publicStatus: 'inReview',
        createdAt: '2026-04-20T08:00:00.000Z',
        updatedAt: '2026-04-20T08:08:00.000Z',
        note: 'The intake details are ready for assignment.',
      }),
    );

    const updatedDetail = await service.assignRequest('hrx_assign_now', {
      ownerId: 'provider_northstar',
      note: 'Best coverage for this neighborhood.',
      actorId: 'ops-default-user',
    });

    expect(updatedDetail.assignment.currentAssignment).toEqual(
      expect.objectContaining({
        ownerType: 'provider',
        ownerLabel: 'Northstar Plumbing Co.',
      }),
    );
    expect(updatedDetail.currentState.lifecycleState).toBe(
      'dispatch_in_progress',
    );
    expect(updatedDetail.currentState.publicStatus).toBe('dispatching');
    expect(updatedDetail.history.at(-1)).toEqual(
      expect.objectContaining({
        actorType: 'ops',
        actorId: 'ops-default-user',
        intervention: null,
      }),
    );

    const queue = await service.getQueue();

    expect(queue.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          publicId: 'hrx_assign_now',
          queueState: 'assigned',
          assignedOwnerLabel: 'Northstar Plumbing Co.',
        }),
      ]),
    );
  });

  it('rejects assignment when the request is not in an assignable state', async () => {
    const store = RequestStoreService.forFilePath(
      join(testDirectory, 'request-assignment-invalid.json'),
    );
    const service = new OpsService(store, new ReferenceDataService());

    await store.createOrGetByIdempotencyKey(
      buildPersistedRequest({
        publicId: 'hrx_not_ready',
        idempotencyKey: 'ops-not-ready',
        issueLabel: 'Slow drain',
        lifecycleState: 'intake_in_review',
        publicStatus: 'received',
        createdAt: '2026-04-20T08:00:00.000Z',
        updatedAt: '2026-04-20T08:00:00.000Z',
        note: 'Customer confirmed the anonymous request through the guided review flow.',
      }),
    );

    await expect(
      service.assignRequest('hrx_not_ready', {
        ownerId: 'provider_northstar',
        actorId: 'ops-default-user',
      }),
    ).rejects.toMatchObject({
      code: 'OPS_ASSIGNMENT_NOT_READY',
    });
  });

  it('updates lifecycle status through valid guarded transitions and preserves append-only history', async () => {
    const store = RequestStoreService.forFilePath(
      join(testDirectory, 'request-status-update.json'),
    );
    const service = new OpsService(store, new ReferenceDataService());

    await store.createOrGetByIdempotencyKey(
      buildPersistedRequest({
        publicId: 'hrx_status_update',
        idempotencyKey: 'ops-status-update',
        issueLabel: 'Slow drain',
        lifecycleState: 'intake_in_review',
        publicStatus: 'received',
        createdAt: '2026-04-20T08:00:00.000Z',
        updatedAt: '2026-04-20T08:00:00.000Z',
        note: 'Customer confirmed the anonymous request through the guided review flow.',
      }),
    );

    const reviewedDetail = await service.updateRequestStatus(
      'hrx_status_update',
      {
        nextLifecycleState: 'intake_in_review',
        actorId: 'ops-default-user',
      },
    );

    expect(reviewedDetail.currentState.lifecycleState).toBe('intake_in_review');
    expect(reviewedDetail.currentState.publicStatus).toBe('inReview');
    expect(reviewedDetail.assignment.canAssign).toBe(true);
    expect(reviewedDetail.history.at(-1)).toEqual(
      expect.objectContaining({
        actorType: 'ops',
        actorId: 'ops-default-user',
        previousLifecycleState: 'intake_in_review',
        nextLifecycleState: 'intake_in_review',
        previousPublicStatus: 'received',
        nextPublicStatus: 'inReview',
        intervention: null,
      }),
    );

    const delayedDetail = await service.updateRequestStatus(
      'hrx_status_update',
      {
        nextLifecycleState: 'dispatch_delayed',
        actorId: 'ops-default-user',
      },
    );

    expect(delayedDetail.currentState.lifecycleState).toBe('dispatch_delayed');
    expect(delayedDetail.currentState.publicStatus).toBe('delayed');
    expect(delayedDetail.intervention).toEqual(
      expect.objectContaining({
        kind: 'blocker',
        label: 'Operational blocker',
      }),
    );
    expect(delayedDetail.availableTransitions).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nextLifecycleState: 'dispatch_in_progress',
        }),
      ]),
    );
  });

  it('rejects invalid lifecycle transitions before mutating persistence', async () => {
    const store = RequestStoreService.forFilePath(
      join(testDirectory, 'request-status-update-invalid.json'),
    );
    const service = new OpsService(store, new ReferenceDataService());

    await store.createOrGetByIdempotencyKey(
      buildPersistedRequest({
        publicId: 'hrx_status_invalid',
        idempotencyKey: 'ops-status-invalid',
        issueLabel: 'Slow drain',
        lifecycleState: 'completed',
        publicStatus: 'completed',
        createdAt: '2026-04-20T08:00:00.000Z',
        updatedAt: '2026-04-20T08:30:00.000Z',
        note: 'The request has been completed successfully.',
      }),
    );

    await expect(
      service.updateRequestStatus('hrx_status_invalid', {
        nextLifecycleState: 'dispatch_delayed',
        actorId: 'ops-default-user',
      }),
    ).rejects.toMatchObject({
      code: 'OPS_STATUS_TRANSITION_INVALID',
    });

    const unchangedRequest = await store.getByPublicId('hrx_status_invalid');

    expect(unchangedRequest?.lifecycleState).toBe('completed');
    expect(unchangedRequest?.history).toHaveLength(1);
  });
});
