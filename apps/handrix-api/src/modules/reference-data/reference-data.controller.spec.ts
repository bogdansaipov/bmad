import {
  supportedIssueTypes,
  type ContainmentGuidanceRequest,
} from '@handrix/shared-contracts';
import { ReferenceDataController } from './reference-data.controller';
import { ReferenceDataService } from './reference-data.service';

describe('ReferenceDataController', () => {
  it('returns the shared success response envelope with supported issue types', () => {
    const controller = new ReferenceDataController(new ReferenceDataService());
    const response = controller.getIssueTypes();

    expect(response.data).toEqual(supportedIssueTypes);
    expect(typeof response.meta?.generatedAt).toBe('string');
  });

  it('returns the intake question set for a supported issue type', () => {
    const controller = new ReferenceDataController(new ReferenceDataService());
    const response = controller.getIntakeQuestionSet('slow-drain');

    expect(response.data.issueTypeId).toBe('slow-drain');
    expect(response.data.questions).toHaveLength(2);
    expect(response.data.questions[0]?.responseType).toBe('boolean');
    expect(typeof response.meta?.generatedAt).toBe('string');
  });

  it('returns informational containment guidance for a serviceable issue', () => {
    const controller = new ReferenceDataController(new ReferenceDataService());
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
});
