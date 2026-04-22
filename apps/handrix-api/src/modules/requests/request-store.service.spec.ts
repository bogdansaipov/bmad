import { mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RequestStoreService } from './request-store.service';

jest.setTimeout(20000);

describe('RequestStoreService', () => {
  const testDirectory = mkdtempSync(join(tmpdir(), 'handrix-request-store-'));

  afterAll(async () => {
    await rm(testDirectory, { recursive: true, force: true });
  });

  it('appends durable history entries with previous and next state context', async () => {
    const store = RequestStoreService.forFilePath(
      join(testDirectory, 'durable-history.json'),
    );

    await store.createOrGetByIdempotencyKey({
      internalId: 'internal-1',
      publicId: 'hrx_history_test',
      idempotencyKey: 'history-test-1',
      requestFingerprint: 'fingerprint-1',
      issueTypeId: 'slow-drain',
      issueLabel: 'Slow drain',
      answers: [],
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
        summaryHeadline:
          'This request can keep moving through the guided flow.',
        summaryDetail:
          'You are still within the supported plumbing scope and service area for the next Handrix step.',
      },
      lifecycleState: 'intake_in_review',
      publicStatus: 'received',
      createdAt: '2026-04-20T08:00:00.000Z',
      trackingCredential: {
        token: 'signed.token',
        expiresAt: '2026-05-20T08:00:00.000Z',
      },
      history: [
        {
          previousLifecycleState: null,
          nextLifecycleState: 'intake_in_review',
          previousPublicStatus: null,
          nextPublicStatus: 'received',
          occurredAt: '2026-04-20T08:00:00.000Z',
          actorType: 'system',
          changeSummary:
            'Customer confirmed the anonymous request through the guided review flow.',
          customerSnapshot: {
            publicStatusLabel: 'Request received',
            publicStatusDetail:
              'Our team is reviewing your issue details and service location so we can confirm the best next step.',
            nextStepDetail:
              'Handrix is reviewing your request details and service location before the next update.',
            recoveryState: null,
          },
        },
      ],
    });

    const updatedRequest = await store.appendHistoryEntry({
      publicId: 'hrx_history_test',
      lifecycleState: 'dispatch_delayed',
      publicStatus: 'delayed',
      createdAt: '2026-04-20T09:25:00.000Z',
      note: 'Arrival timing is taking longer than first expected while the route is rechecked.',
      actorType: 'system',
    });

    expect(updatedRequest?.history.at(-1)).toMatchObject({
      previousLifecycleState: 'intake_in_review',
      nextLifecycleState: 'dispatch_delayed',
      previousPublicStatus: 'received',
      nextPublicStatus: 'delayed',
      actorType: 'system',
      intervention: {
        kind: 'blocker',
      },
    });
    expect(
      updatedRequest?.history.at(-1)?.customerSnapshot.nextStepDetail,
    ).toBe(
      'This request is still active, but the next service update may take longer than originally expected while Handrix works through the delay.',
    );
    expect(
      updatedRequest?.history.at(-1)?.customerSnapshot.recoveryState?.kind,
    ).toBe('delay');
  });

  it('persists assignment data and lifecycle progression in a single durable update', async () => {
    const store = RequestStoreService.forFilePath(
      join(testDirectory, 'assignment-update.json'),
    );

    await store.createOrGetByIdempotencyKey({
      internalId: 'internal-assign-1',
      publicId: 'hrx_assignment_test',
      idempotencyKey: 'assignment-test-1',
      requestFingerprint: 'fingerprint-assignment-1',
      issueTypeId: 'slow-drain',
      issueLabel: 'Slow drain',
      answers: [],
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
        summaryHeadline:
          'This request can keep moving through the guided flow.',
        summaryDetail:
          'You are still within the supported plumbing scope and service area for the next Handrix step.',
      },
      lifecycleState: 'intake_in_review',
      publicStatus: 'inReview',
      createdAt: '2026-04-20T08:00:00.000Z',
      trackingCredential: {
        token: 'signed.token.assignment',
        expiresAt: '2026-05-20T08:00:00.000Z',
      },
      history: [
        {
          previousLifecycleState: null,
          nextLifecycleState: 'intake_in_review',
          previousPublicStatus: null,
          nextPublicStatus: 'inReview',
          occurredAt: '2026-04-20T08:00:00.000Z',
          actorType: 'system',
          changeSummary:
            'Operations completed the initial review and marked the request ready for assignment.',
          customerSnapshot: {
            publicStatusLabel: 'In review',
            publicStatusDetail:
              'Handrix is confirming the best next step for this request.',
            nextStepDetail:
              'Handrix is matching the request with the right fulfillment path.',
            recoveryState: null,
          },
        },
      ],
    });

    const updatedRequest = await store.assignFulfillmentOwner({
      publicId: 'hrx_assignment_test',
      assignment: {
        ownerType: 'provider',
        ownerId: 'provider_northstar',
        ownerLabel: 'Northstar Plumbing Co.',
        assignedAt: '2026-04-20T09:25:00.000Z',
        note: 'Closest partner for this ZIP code.',
      },
      lifecycleState: 'dispatch_in_progress',
      publicStatus: 'dispatching',
      note: 'Operations assigned Northstar Plumbing Co. and moved the request into dispatch.',
      actorId: 'ops-default-user',
    });

    expect(updatedRequest?.assignment).toEqual({
      ownerType: 'provider',
      ownerId: 'provider_northstar',
      ownerLabel: 'Northstar Plumbing Co.',
      assignedAt: '2026-04-20T09:25:00.000Z',
      note: 'Closest partner for this ZIP code.',
    });
    expect(updatedRequest?.lifecycleState).toBe('dispatch_in_progress');
    expect(updatedRequest?.publicStatus).toBe('dispatching');
    expect(updatedRequest?.history.at(-1)).toMatchObject({
      actorType: 'ops',
      actorId: 'ops-default-user',
      previousLifecycleState: 'intake_in_review',
      nextLifecycleState: 'dispatch_in_progress',
      previousPublicStatus: 'inReview',
      nextPublicStatus: 'dispatching',
    });
  });

  it('persists generic lifecycle transitions without losing assignment context', async () => {
    const store = RequestStoreService.forFilePath(
      join(testDirectory, 'lifecycle-transition-update.json'),
    );

    await store.createOrGetByIdempotencyKey({
      internalId: 'internal-transition-1',
      publicId: 'hrx_transition_test',
      idempotencyKey: 'transition-test-1',
      requestFingerprint: 'fingerprint-transition-1',
      issueTypeId: 'slow-drain',
      issueLabel: 'Slow drain',
      answers: [],
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
        summaryHeadline:
          'This request can keep moving through the guided flow.',
        summaryDetail:
          'You are still within the supported plumbing scope and service area for the next Handrix step.',
      },
      lifecycleState: 'dispatch_in_progress',
      publicStatus: 'dispatching',
      createdAt: '2026-04-20T08:00:00.000Z',
      trackingCredential: {
        token: 'signed.token.transition',
        expiresAt: '2026-05-20T08:00:00.000Z',
      },
      assignment: {
        ownerType: 'provider',
        ownerId: 'provider_northstar',
        ownerLabel: 'Northstar Plumbing Co.',
        assignedAt: '2026-04-20T08:10:00.000Z',
      },
      history: [
        {
          previousLifecycleState: null,
          nextLifecycleState: 'dispatch_in_progress',
          previousPublicStatus: null,
          nextPublicStatus: 'dispatching',
          occurredAt: '2026-04-20T08:10:00.000Z',
          actorType: 'ops',
          changeSummary:
            'Operations assigned Northstar Plumbing Co. and moved the request into dispatch.',
          customerSnapshot: {
            publicStatusLabel: 'Dispatch in progress',
            publicStatusDetail:
              'A Handrix team member is actively moving this request forward and preparing the next service update.',
            nextStepDetail:
              'Handrix is actively moving this request forward and will share the next service update as progress changes.',
            recoveryState: null,
          },
        },
      ],
    });

    const updatedRequest = await store.transitionRequestLifecycle({
      publicId: 'hrx_transition_test',
      lifecycleState: 'dispatch_delayed',
      publicStatus: 'delayed',
      occurredAt: '2026-04-20T09:25:00.000Z',
      note: 'Operations marked the request as delayed while the fulfillment blocker is worked through.',
      actorType: 'ops',
      actorId: 'ops-default-user',
    });

    expect(updatedRequest?.assignment).toEqual({
      ownerType: 'provider',
      ownerId: 'provider_northstar',
      ownerLabel: 'Northstar Plumbing Co.',
      assignedAt: '2026-04-20T08:10:00.000Z',
    });
    expect(updatedRequest?.history.at(-1)).toMatchObject({
      previousLifecycleState: 'dispatch_in_progress',
      nextLifecycleState: 'dispatch_delayed',
      previousPublicStatus: 'dispatching',
      nextPublicStatus: 'delayed',
      actorType: 'ops',
      actorId: 'ops-default-user',
      intervention: {
        kind: 'blocker',
      },
    });
  });

  it('persists internal-only support follow-up without changing customer visibility defaults', async () => {
    const store = RequestStoreService.forFilePath(
      join(testDirectory, 'support-follow-up.json'),
    );

    await store.createOrGetByIdempotencyKey({
      internalId: 'internal-support-1',
      publicId: 'hrx_support_followup',
      idempotencyKey: 'support-followup-1',
      requestFingerprint: 'fingerprint-support-followup-1',
      issueTypeId: 'slow-drain',
      issueLabel: 'Slow drain',
      answers: [],
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
        summaryHeadline:
          'This request can keep moving through the guided flow.',
        summaryDetail:
          'You are still within the supported plumbing scope and service area for the next Handrix step.',
      },
      lifecycleState: 'dispatch_delayed',
      publicStatus: 'delayed',
      createdAt: '2026-04-20T08:00:00.000Z',
      trackingCredential: {
        token: 'signed.token.support-followup',
        expiresAt: '2026-05-20T08:00:00.000Z',
      },
      history: [
        {
          previousLifecycleState: null,
          nextLifecycleState: 'dispatch_delayed',
          previousPublicStatus: null,
          nextPublicStatus: 'delayed',
          occurredAt: '2026-04-20T08:10:00.000Z',
          actorType: 'ops',
          changeSummary: 'Operations marked the request as delayed.',
          visibility: 'customer',
          customerSnapshot: {
            publicStatusLabel: 'Dispatch delayed',
            publicStatusDetail:
              'This request is still active, but the expected progress timing has changed and the next update should explain the revised expectation clearly.',
            nextStepDetail:
              'This request is still active, but the next service update may take longer than originally expected while Handrix works through the delay.',
            recoveryState: {
              kind: 'delay',
              title: 'Dispatch delayed',
              detail:
                'The request is still active, but the timing has changed while we work through the delay.',
              expectationUpdate:
                'The next update should confirm the revised timing clearly.',
              nextActionLabel: 'Watch for the revised update',
              nextActionDetail:
                'Keep the area stable and watch for the next progress update from Handrix.',
            },
          },
        },
      ],
    });

    const updatedRequest = await store.transitionRequestLifecycle({
      publicId: 'hrx_support_followup',
      lifecycleState: 'dispatch_delayed',
      publicStatus: 'delayed',
      occurredAt: '2026-04-20T09:25:00.000Z',
      note: 'Support confirmed building access instructions with the customer.',
      actorType: 'support',
      actorId: 'support-default-user',
      visibility: 'internal',
      intervention: {
        kind: 'blocker',
        detail:
          'Support confirmed building access instructions with the customer.',
      },
    });

    expect(updatedRequest?.history.at(-1)).toMatchObject({
      actorType: 'support',
      actorId: 'support-default-user',
      visibility: 'internal',
      previousLifecycleState: 'dispatch_delayed',
      nextLifecycleState: 'dispatch_delayed',
      previousPublicStatus: 'delayed',
      nextPublicStatus: 'delayed',
      intervention: {
        kind: 'blocker',
        detail:
          'Support confirmed building access instructions with the customer.',
      },
    });
  });
});
