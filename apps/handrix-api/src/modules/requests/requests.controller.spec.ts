import { mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RequestsController } from './requests.controller';
import { RequestStoreService } from './request-store.service';
import { RequestsService } from './requests.service';
import { ReferenceDataService } from '../reference-data/reference-data.service';

describe('RequestsController', () => {
  const testDirectory = mkdtempSync(
    join(tmpdir(), 'handrix-requests-controller-'),
  );
  let controllerCounter = 0;

  function buildController() {
    controllerCounter += 1;

    return new RequestsController(
      new RequestsService(
        new ReferenceDataService(),
        RequestStoreService.forFilePath(
          join(testDirectory, `controller-${controllerCounter}.json`),
        ),
      ),
    );
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
    expect(response.data.trackingCredential.token).toContain('.');
  });

  afterAll(async () => {
    await rm(testDirectory, { recursive: true, force: true });
  });
});
