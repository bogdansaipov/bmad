import { ReferenceDataService } from './reference-data.service';

describe('ReferenceDataService', () => {
  const service = new ReferenceDataService();

  it('evaluates supported issue answers and in-area service locations from reference data', () => {
    const decision = service.evaluateIntakeDecision(
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

    expect(decision.classification).toMatchObject({
      issueTypeId: 'slow-drain',
      serviceabilityStatus: 'serviceable',
      nextStep: 'continueToContainment',
    });
    expect(decision.scopeDecision).toEqual({
      scopeDecisionLabel: 'Within supported plumbing scope',
      scopeDecisionDetail:
        'The intake answers still match the supported single-drain slowdown path for the MVP.',
      coverageDecisionLabel: 'Inside active service area',
      coverageDecisionDetail:
        'ZIP code 10011 is inside the current Handrix service area.',
    });
  });

  it('evaluates out-of-area service locations from the same reference-data rules', () => {
    const decision = service.evaluateIntakeDecision(
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

    expect(decision.classification.serviceabilityStatus).toBe('outOfArea');
    expect(decision.classification.recoveryCode).toBe('OUT_OF_SERVICE_AREA');
    expect(decision.scopeDecision).toEqual({
      scopeDecisionLabel: 'Within supported plumbing scope',
      scopeDecisionDetail:
        'The intake answers still match the supported single-fixture faucet path for the MVP.',
      coverageDecisionLabel: 'Outside active service area',
      coverageDecisionDetail:
        'ZIP code 07102 is outside the current Handrix service area, so normal fulfillment should stay blocked.',
    });
  });
});
