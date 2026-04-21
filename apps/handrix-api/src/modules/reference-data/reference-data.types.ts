import type { IntakeClassification } from '@handrix/shared-contracts';

export type ReferenceDataScopeDecision = {
  scopeDecisionLabel: string;
  scopeDecisionDetail: string;
  coverageDecisionLabel: string;
  coverageDecisionDetail: string;
};

export type ReferenceDataIntakeDecision = {
  classification: IntakeClassification;
  scopeDecision: ReferenceDataScopeDecision;
};
