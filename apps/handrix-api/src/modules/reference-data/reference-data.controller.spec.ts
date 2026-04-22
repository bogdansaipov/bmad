import { BadRequestException } from '@nestjs/common';
import { type ContainmentGuidanceRequest } from '@handrix/shared-contracts';
import { ReferenceDataController } from './reference-data.controller';
import { ReferenceDataService } from './reference-data.service';

describe('ReferenceDataController', () => {
  const referenceDataService = new ReferenceDataService();

  it('returns the shared success response envelope with backend-owned issue types', () => {
    const controller = new ReferenceDataController(referenceDataService);
    const response = controller.getIssueTypes();

    expect(response.data).toEqual(referenceDataService.getIssueTypes());
    expect(typeof response.meta?.generatedAt).toBe('string');
  });

  it('returns the intake question set for a supported issue type', () => {
    const controller = new ReferenceDataController(referenceDataService);
    const response = controller.getIntakeQuestionSet('slow-drain');

    expect(response.data.issueTypeId).toBe('slow-drain');
    expect(response.data.questions).toHaveLength(2);
    expect(response.data.questions[0]?.responseType).toBe('boolean');
    expect(typeof response.meta?.generatedAt).toBe('string');
  });

  it('returns informational containment guidance for a serviceable issue', () => {
    const controller = new ReferenceDataController(referenceDataService);
    const response = controller.getContainmentGuidance('slow-drain', {
      serviceabilityStatus: 'serviceable',
      nextStep: 'continueToContainment',
    } satisfies ContainmentGuidanceRequest);

    expect(response.data.issueTypeId).toBe('slow-drain');
    expect(response.data.variant).toBe('informational');
    expect(response.data.steps.length).toBeGreaterThan(0);
    expect(response.data.nextActionLabel).toMatch(/review/i);
    expect(typeof response.meta?.generatedAt).toBe('string');
  });

  it('returns backend-owned scope and coverage context through the reference-data service seam', () => {
    const decision = referenceDataService.evaluateIntakeDecision(
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
        locationDetails: '',
      },
    );

    expect(decision.scopeDecision.coverageDecisionLabel).toBe(
      'Inside active service area',
    );
    expect(decision.scopeDecision.scopeDecisionLabel).toBe(
      'Within supported plumbing scope',
    );
  });

  it('returns the shared error envelope for unsupported issue types', () => {
    const controller = new ReferenceDataController(referenceDataService);

    expect(() => controller.getIntakeQuestionSet('not-a-real-issue')).toThrow(
      BadRequestException,
    );

    try {
      controller.getIntakeQuestionSet('not-a-real-issue');
    } catch (error) {
      expect((error as BadRequestException).getResponse()).toMatchObject({
        error: {
          code: 'REFERENCE_DATA_ISSUE_TYPE_INVALID',
        },
      });
    }
  });
});
