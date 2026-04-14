import { mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ReferenceDataService } from '../reference-data/reference-data.service';
import { RequestStoreService } from './request-store.service';
import { RequestsService } from './requests.service';

describe('RequestsService', () => {
  const testDirectory = mkdtempSync(
    join(tmpdir(), 'handrix-requests-service-'),
  );
  const service = new RequestsService(
    new ReferenceDataService(),
    RequestStoreService.forFilePath(join(testDirectory, 'requests.json')),
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
    expect(result.lifecycleState).toBe('intake_in_review');
    expect(result.publicStatus).toBe('received');
    expect(result.trackingCredential.token).toContain('.');
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

  afterAll(async () => {
    await rm(testDirectory, { recursive: true, force: true });
  });
});
