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
import { SupportService } from './support.service';

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

    return new SupportService(store);
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

  it('returns the minimal detail payload without history or intake answers', async () => {
    const service = await buildServiceWithSeededRequests('detail-shape.json');

    const detail = await service.getRequestDetail('hrx_first');

    expect(detail).not.toBeNull();
    expect(detail!.publicId).toBe('hrx_first');
    expect(detail!).not.toHaveProperty('history');
    expect(detail!).not.toHaveProperty('intakeAnswers');
    expect(detail!).not.toHaveProperty('intervention');
    expect(detail!).not.toHaveProperty('customerContext');
    expect(detail!).not.toHaveProperty('assignment');
    expect(detail!.currentAssignmentOwnerLabel).toBeNull();
    expect(detail!.interventionLabel).toBeNull();
    expect(detail!.currentState.lifecycleStateLabel).toBe('Intake in review');
    expect(detail!.currentState.publicStatusLabel).toBe('Request received');
  });

  it('returns null from getRequestDetail for an unknown publicId', async () => {
    const service = await buildServiceWithSeededRequests('unknown-detail.json');

    const detail = await service.getRequestDetail('hrx_missing');

    expect(detail).toBeNull();
  });
});
