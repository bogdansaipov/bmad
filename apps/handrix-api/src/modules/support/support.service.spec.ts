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
import { SupportService } from './support.service';

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
  addressLine1?: string;
  city?: string;
  postalCode?: string;
  unitOrAccessNote?: string;
  assignment?: PersistedServiceRequest['assignment'];
  customerContext?: PersistedServiceRequest['customerContext'];
  history?: PersistedServiceRequest['history'];
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
      addressLine1: input.addressLine1 ?? '15 Spring Street',
      city: input.city ?? 'New York',
      postalCode: input.postalCode ?? '10011',
      unitOrAccessNote: input.unitOrAccessNote ?? '',
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
    history: input.history ?? [
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

describe('SupportService', () => {
  const testDirectory = mkdtempSync(join(tmpdir(), 'handrix-support-service-'));

  afterAll(async () => {
    await rm(testDirectory, { recursive: true, force: true });
  });

  async function buildServiceWithSeededRequests(fileName: string) {
    const store = RequestStoreService.forFilePath(
      join(testDirectory, fileName),
    );

    await store.createOrGetByIdempotencyKey(
      buildPersistedRequest({
        publicId: 'hrx_first',
        idempotencyKey: 'support-first',
        issueLabel: 'Slow drain',
        lifecycleState: 'intake_in_review',
        publicStatus: 'received',
        createdAt: '2026-04-20T10:00:00.000Z',
        updatedAt: '2026-04-20T10:05:00.000Z',
        note: 'Customer confirmed the anonymous request through the guided review flow.',
        addressLine1: '15 Spring Street',
        city: 'New York',
        postalCode: '10011',
      }),
    );

    await store.createOrGetByIdempotencyKey(
      buildPersistedRequest({
        publicId: 'hrx_second',
        idempotencyKey: 'support-second',
        issueLabel: 'Clogged toilet',
        lifecycleState: 'dispatch_in_progress',
        publicStatus: 'dispatching',
        createdAt: '2026-04-20T11:00:00.000Z',
        updatedAt: '2026-04-20T12:30:00.000Z',
        note: 'Operations assigned a fulfillment owner.',
        addressLine1: '200 Metropolitan Avenue',
        city: 'Brooklyn',
        postalCode: '11211',
        assignment: {
          ownerType: 'provider',
          ownerId: 'provider_northstar',
          ownerLabel: 'Northstar Plumbing Co.',
          assignedAt: '2026-04-20T12:30:00.000Z',
        },
      }),
    );

    await store.createOrGetByIdempotencyKey(
      buildPersistedRequest({
        publicId: 'hrx_third',
        idempotencyKey: 'support-third',
        issueLabel: 'Dripping faucet',
        lifecycleState: 'clarification_needed',
        publicStatus: 'needsClarification',
        createdAt: '2026-04-19T09:00:00.000Z',
        updatedAt: '2026-04-21T08:00:00.000Z',
        note: 'Operations flagged the request for clarification.',
        addressLine1: '400 Riverside Drive',
        city: 'New York',
        postalCode: '10025',
      }),
    );

    return new SupportService(store, new ReferenceDataService());
  }

  it('matches by partial publicId, issue label, address line, city, and postal code', async () => {
    const service = await buildServiceWithSeededRequests(
      'partial-matches.json',
    );

    const idMatch = await service.searchRequests({ q: 'first' });
    expect(idMatch.items.map((item) => item.publicId)).toEqual(['hrx_first']);

    const issueMatch = await service.searchRequests({ q: 'Drip' });
    expect(issueMatch.items.map((item) => item.publicId)).toEqual([
      'hrx_third',
    ]);

    const addressMatch = await service.searchRequests({ q: 'metropolitan' });
    expect(addressMatch.items.map((item) => item.publicId)).toEqual([
      'hrx_second',
    ]);

    const cityMatch = await service.searchRequests({ q: 'brooklyn' });
    expect(cityMatch.items.map((item) => item.publicId)).toEqual([
      'hrx_second',
    ]);

    const postalMatch = await service.searchRequests({ q: '10025' });
    expect(postalMatch.items.map((item) => item.publicId)).toEqual([
      'hrx_third',
    ]);
  });

  it('treats search as case-insensitive', async () => {
    const service = await buildServiceWithSeededRequests(
      'case-insensitive.json',
    );

    const upper = await service.searchRequests({ q: 'SLOW' });
    const lower = await service.searchRequests({ q: 'slow' });

    expect(upper.items.map((item) => item.publicId)).toEqual(['hrx_first']);
    expect(lower.items.map((item) => item.publicId)).toEqual(['hrx_first']);
  });

  it('sorts matches by most recently updated first, then by createdAt desc', async () => {
    const service = await buildServiceWithSeededRequests('sort-order.json');

    const response = await service.searchRequests({ q: 'new york' });

    expect(response.items.map((item) => item.publicId)).toEqual([
      'hrx_third',
      'hrx_first',
    ]);
  });

  it('enforces the limit cap and reports limitReached in the summary', async () => {
    const service = await buildServiceWithSeededRequests('limit-cap.json');

    const response = await service.searchRequests({ q: 'hrx', limit: 1 });

    expect(response.items).toHaveLength(1);
    expect(response.summary.totalMatched).toBeGreaterThan(1);
    expect(response.summary.limitReached).toBe(true);
  });

  it('returns an empty envelope for a query shorter than 2 characters without throwing', async () => {
    const service = await buildServiceWithSeededRequests('short-query.json');

    const response = await service.searchRequests({ q: 'a' });

    expect(response.items).toEqual([]);
    expect(response.summary).toEqual({
      totalMatched: 0,
      limitReached: false,
    });
    expect(response.query.q).toBe('a');
    expect(response.query.normalizedQ).toBe('a');
  });

  it('returns an empty envelope for an empty query without scanning the store', async () => {
    const service = await buildServiceWithSeededRequests('empty-query.json');

    const response = await service.searchRequests({});

    expect(response.items).toEqual([]);
    expect(response.summary.totalMatched).toBe(0);
    expect(response.query.q).toBeNull();
    expect(response.query.normalizedQ).toBe('');
  });

  it('surfaces assignment owner label and intervention label on search results when present', async () => {
    const service = await buildServiceWithSeededRequests('intervention.json');

    const assignedMatch = await service.searchRequests({ q: 'Clogged' });
    expect(assignedMatch.items[0].currentAssignmentOwnerLabel).toBe(
      'Northstar Plumbing Co.',
    );
    expect(assignedMatch.items[0].interventionLabel).toBeNull();

    const clarificationMatch = await service.searchRequests({ q: 'Drip' });
    expect(clarificationMatch.items[0].currentAssignmentOwnerLabel).toBeNull();
    expect(clarificationMatch.items[0].interventionLabel).toBe(
      'Clarification needed',
    );
  });

  it('returns the full detail payload with customer context and ordered history', async () => {
    const service = await buildServiceWithSeededRequests('detail-shape.json');

    const detail = await service.getRequestDetail('hrx_first');

    expect(detail).not.toBeNull();
    expect(detail!.publicId).toBe('hrx_first');
    expect(detail!.intakeAnswers[0]).toEqual({
      questionLabel: 'Is only one drain running slowly?',
      answerLabel: 'Yes',
    });
    expect(detail!.customerContext.containmentGuidance).toBeNull();
    expect(detail!.customerContext.requestReviewSummary).toBeNull();
    expect(detail!.assignment).toBeNull();
    expect(detail!.intervention).toBeNull();
    expect(detail!.explanation).toBeNull();
    expect(detail!.history).toHaveLength(1);
    expect(detail!.history[0].customerSnapshot.publicStatusLabel).toBe(
      'Request received',
    );
    expect(detail!.history[0].previousLifecycleStateLabel).toBeNull();
    expect(detail!.history[0].nextLifecycleStateLabel).toBe('Intake in review');
    expect(detail!.history[0].previousPublicStatusLabel).toBeNull();
    expect(detail!.history[0].nextPublicStatusLabel).toBe('Request received');
    expect(detail!.currentState.lifecycleStateLabel).toBe('Intake in review');
    expect(detail!.currentState.publicStatusLabel).toBe('Request received');
    expect(detail!).not.toHaveProperty('trackingCredential');
    expect(detail!).not.toHaveProperty('idempotencyKey');
    expect(detail!).not.toHaveProperty('requestFingerprint');
  });

  it('surfaces persisted customer context, assignment notes, and intervention summary when present', async () => {
    const store = RequestStoreService.forFilePath(
      join(testDirectory, 'rich-detail.json'),
    );

    await store.createOrGetByIdempotencyKey(
      buildPersistedRequest({
        publicId: 'hrx_rich',
        idempotencyKey: 'support-rich',
        issueLabel: 'Clogged toilet',
        lifecycleState: 'dispatch_delayed',
        publicStatus: 'delayed',
        createdAt: '2026-04-20T10:00:00.000Z',
        updatedAt: '2026-04-21T09:00:00.000Z',
        note: 'Dispatch is delayed while a building access issue is resolved.',
        assignment: {
          ownerType: 'provider',
          ownerId: 'provider_northstar',
          ownerLabel: 'Northstar Plumbing Co.',
          assignedAt: '2026-04-20T12:30:00.000Z',
          note: 'Call ahead before arrival.',
        },
        customerContext: {
          shownContainmentGuidance: {
            issueTypeId: 'clogged-toilet',
            serviceabilityStatus: 'serviceable',
            nextStep: 'continueToContainment',
            variant: 'warning',
            headline: 'Keep overflow risk low while we prepare the next step.',
            intro:
              'A contained toilet blockage should stay out of use for now.',
            steps: [
              {
                title: 'Avoid flushing again',
                detail: 'Additional flushing can worsen overflow risk.',
              },
            ],
            warnings: [
              {
                title: 'If sewage backs up elsewhere',
                detail: 'Move to the fallback path immediately.',
              },
            ],
            reassurance:
              'You have already shared the right details for the next step.',
            nextActionLabel: 'Continue to request review',
            nextActionHint:
              'Next, we will summarize timing, pricing expectations, and your request details.',
          },
          shownRequestReviewSummary: {
            issueTypeId: 'clogged-toilet',
            issueLabel: 'Clogged toilet',
            headline: 'Review the request details before you confirm.',
            intro: 'A quick final check before submission.',
            sections: [
              {
                title: 'Issue details',
                editTarget: 'issueDetails',
                editLabel: 'Edit issue details',
                items: [{ label: 'Selected issue', value: 'Clogged toilet' }],
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
              detail: 'Contained toilet issues are reviewed quickly.',
            },
            pricing: {
              label: 'Pricing expectation',
              value: 'Most visits start with an $89 to $139 assessment',
              detail: 'Any added work is confirmed before you approve it.',
            },
            nextSteps: {
              title: 'What happens next',
              detail: 'Handrix reviews the request and confirms the best path.',
              bullets: ['Operations reviews the request.'],
            },
            confirmationLabel: 'Confirm request',
            confirmationHint: 'You can still go back to edit details.',
          },
        },
        history: [
          createPersistedHistoryEntry({
            previousLifecycleState: null,
            nextLifecycleState: 'intake_in_review',
            previousPublicStatus: null,
            nextPublicStatus: 'received',
            occurredAt: '2026-04-20T10:05:00.000Z',
            changeSummary:
              'Customer confirmed the anonymous request through the guided review flow.',
            actorType: 'customer',
          }),
          createPersistedHistoryEntry({
            previousLifecycleState: 'intake_in_review',
            nextLifecycleState: 'dispatch_in_progress',
            previousPublicStatus: 'received',
            nextPublicStatus: 'dispatching',
            occurredAt: '2026-04-20T12:30:00.000Z',
            changeSummary: 'Operations assigned Northstar Plumbing Co.',
            actorType: 'ops',
          }),
          createPersistedHistoryEntry({
            previousLifecycleState: 'dispatch_in_progress',
            nextLifecycleState: 'dispatch_delayed',
            previousPublicStatus: 'dispatching',
            nextPublicStatus: 'delayed',
            occurredAt: '2026-04-21T09:00:00.000Z',
            changeSummary:
              'Dispatch is delayed while a building access issue is resolved.',
            actorType: 'ops',
          }),
        ],
      }),
    );

    const service = new SupportService(store, new ReferenceDataService());
    const detail = await service.getRequestDetail('hrx_rich');

    expect(detail).not.toBeNull();
    expect(detail!.assignment).toEqual({
      ownerType: 'provider',
      ownerTypeLabel: 'Provider',
      ownerLabel: 'Northstar Plumbing Co.',
      assignedAt: '2026-04-20T12:30:00.000Z',
      note: 'Call ahead before arrival.',
    });
    expect(detail!.customerContext.containmentGuidance?.headline).toContain(
      'Keep overflow risk low',
    );
    expect(detail!.customerContext.requestReviewSummary?.issueLabel).toBe(
      'Clogged toilet',
    );
    expect(detail!.intervention).toMatchObject({
      kind: 'blocker',
      label: 'Operational blocker',
    });
    expect(detail!.explanation).toMatchObject({
      kind: 'blocker',
      label: 'Operational blocker',
      reasonDetail:
        'Dispatch is delayed while a building access issue is resolved.',
    });
    expect(detail!.explanation?.customerVisibleRecovery?.kind).toBe('delay');
    expect(detail!.explanation?.customerVisibleRecovery?.nextActionLabel).toBe(
      'Watch for the revised update',
    );
    expect(detail!.history.map((entry) => entry.changeSummary)).toEqual([
      'Customer confirmed the anonymous request through the guided review flow.',
      'Operations assigned Northstar Plumbing Co.',
      'Dispatch is delayed while a building access issue is resolved.',
    ]);
    expect(detail!.history[2]).toMatchObject({
      previousLifecycleStateLabel: 'Dispatch in progress',
      nextLifecycleStateLabel: 'Dispatch delayed',
      previousPublicStatusLabel: 'Dispatch in progress',
      nextPublicStatusLabel: 'Dispatch delayed',
    });
  });

  it('differentiates clarification and unavailable explanation scenarios', async () => {
    const store = RequestStoreService.forFilePath(
      join(testDirectory, 'scenario-explanations.json'),
    );

    await store.createOrGetByIdempotencyKey(
      buildPersistedRequest({
        publicId: 'hrx_clarify',
        idempotencyKey: 'support-clarify',
        issueLabel: 'Slow drain',
        lifecycleState: 'clarification_needed',
        publicStatus: 'needsClarification',
        createdAt: '2026-04-20T10:00:00.000Z',
        updatedAt: '2026-04-20T11:00:00.000Z',
        note: 'Operations requested one more access detail before dispatch.',
      }),
    );

    await store.createOrGetByIdempotencyKey(
      buildPersistedRequest({
        publicId: 'hrx_unavailable',
        idempotencyKey: 'support-unavailable',
        issueLabel: 'Burst pipe',
        lifecycleState: 'unfulfilled',
        publicStatus: 'unavailable',
        createdAt: '2026-04-20T12:00:00.000Z',
        updatedAt: '2026-04-20T14:00:00.000Z',
        note: 'This building is outside the currently approved service path.',
      }),
    );

    const service = new SupportService(store, new ReferenceDataService());

    const clarification = await service.getRequestDetail('hrx_clarify');
    const unavailable = await service.getRequestDetail('hrx_unavailable');

    expect(clarification?.explanation).toMatchObject({
      kind: 'clarification',
      label: 'Clarification needed',
    });
    expect(clarification?.explanation?.customerVisibleRecovery?.kind).toBe(
      'clarification',
    );
    expect(unavailable?.explanation).toMatchObject({
      kind: 'unavailable',
      label: 'Unavailable outcome',
    });
    expect(unavailable?.explanation?.customerVisibleRecovery?.kind).toBe(
      'unavailable',
    );
  });

  it('returns null from getRequestDetail for an unknown publicId', async () => {
    const service = await buildServiceWithSeededRequests('unknown-detail.json');

    const detail = await service.getRequestDetail('hrx_missing');

    expect(detail).toBeNull();
  });

  it('records an internal-only support follow-up without changing the customer lifecycle', async () => {
    const service = await buildServiceWithSeededRequests(
      'record-internal-follow-up.json',
    );

    const detail = await service.recordIntervention('hrx_second', {
      kind: 'blocker',
      note: 'Support confirmed the gate code with the customer for the provider.',
      actorId: 'support-default-user',
      updateLifecycle: false,
    });

    expect(detail.currentState.lifecycleState).toBe('dispatch_in_progress');
    expect(detail.currentState.publicStatus).toBe('dispatching');
    expect(detail.latestSupportFollowUp).toMatchObject({
      kind: 'blocker',
      detail:
        'Support confirmed the gate code with the customer for the provider.',
      visibility: 'internal',
      visibilityLabel: 'Internal only',
      affectsLifecycle: false,
    });
    expect(detail.history.at(-1)).toMatchObject({
      actorType: 'support',
      visibility: 'internal',
      intervention: {
        kind: 'blocker',
        detail:
          'Support confirmed the gate code with the customer for the provider.',
      },
    });
  });

  it('records a lifecycle-aligned support intervention when follow-up changes the request state', async () => {
    const service = await buildServiceWithSeededRequests(
      'record-lifecycle-follow-up.json',
    );

    const detail = await service.recordIntervention('hrx_second', {
      kind: 'clarification',
      note: 'Please confirm whether evening building access is required.',
      actorId: 'support-default-user',
      updateLifecycle: true,
    });

    expect(detail.currentState.lifecycleState).toBe('clarification_needed');
    expect(detail.currentState.publicStatus).toBe('needsClarification');
    expect(detail.latestSupportFollowUp).toMatchObject({
      kind: 'clarification',
      visibility: 'customer',
      affectsLifecycle: true,
    });
    expect(detail.history.at(-1)).toMatchObject({
      actorType: 'support',
      visibility: 'customer',
      nextLifecycleState: 'clarification_needed',
      nextPublicStatus: 'needsClarification',
      intervention: {
        kind: 'clarification',
        detail: 'Please confirm whether evening building access is required.',
      },
    });
  });

  it('rejects support lifecycle updates that do not follow approved transition rules', async () => {
    const service = await buildServiceWithSeededRequests(
      'invalid-lifecycle-follow-up.json',
    );

    await expect(
      service.recordIntervention('hrx_third', {
        kind: 'blocker',
        note: 'Support is trying to force a blocker before dispatch starts.',
        actorId: 'support-default-user',
        updateLifecycle: true,
      }),
    ).rejects.toMatchObject({
      code: 'SUPPORT_INTERVENTION_TRANSITION_INVALID',
    });
  });
});
