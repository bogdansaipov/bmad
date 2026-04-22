import { buildRequestStatusResponse } from './request-status-timeline.presenter';
import {
  createPersistedHistoryEntry,
  type PersistedServiceRequest,
} from './request-store.service';

describe('request status timeline presenter', () => {
  it('keeps internal-only support follow-up out of customer status history and timeline', () => {
    const request: PersistedServiceRequest = {
      internalId: 'internal-status-1',
      publicId: 'hrx_status_test',
      idempotencyKey: 'status-test-1',
      requestFingerprint: 'fingerprint-status-1',
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
        token: 'signed.token.status',
        expiresAt: '2026-05-20T08:00:00.000Z',
      },
      history: [
        createPersistedHistoryEntry({
          previousLifecycleState: null,
          nextLifecycleState: 'dispatch_delayed',
          previousPublicStatus: null,
          nextPublicStatus: 'delayed',
          occurredAt: '2026-04-20T08:10:00.000Z',
          changeSummary: 'Operations marked the request as delayed.',
        }),
        createPersistedHistoryEntry({
          previousLifecycleState: 'dispatch_delayed',
          nextLifecycleState: 'dispatch_delayed',
          previousPublicStatus: 'delayed',
          nextPublicStatus: 'delayed',
          occurredAt: '2026-04-20T09:10:00.000Z',
          changeSummary:
            'Support confirmed building access instructions with the customer.',
          actorType: 'support',
          visibility: 'internal',
          intervention: {
            kind: 'blocker',
            detail:
              'Support confirmed building access instructions with the customer.',
          },
        }),
      ],
    };

    const response = buildRequestStatusResponse(request);

    expect(response.latestChangeSummary).toBe(
      'Operations marked the request as delayed.',
    );
    expect(response.history).toHaveLength(1);
    expect(response.timeline).toHaveLength(1);
    expect(
      response.history[0]?.changeSummary.includes('Support confirmed'),
    ).toBe(false);
  });
});
