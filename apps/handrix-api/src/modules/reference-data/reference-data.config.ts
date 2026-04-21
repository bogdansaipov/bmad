import {
  issueTypeListSchema,
  type ClarifyingAnswer,
  type IssueType,
  type IssueTypeId,
} from '@handrix/shared-contracts';

type AnswerMap = Record<string, ClarifyingAnswer['value']>;

type ScopeRuleDefinition = {
  isInScope: (answerMap: AnswerMap) => boolean;
  inScopeDetail: string;
  outOfScopeDetail: string;
};

export const referenceIssueTypes: IssueType[] = issueTypeListSchema.parse([
  {
    id: 'dripping-faucet',
    label: 'Dripping faucet',
    shortDescription:
      'Water keeps dripping from a sink or fixture that should be off.',
    urgencyCue: 'Usually manageable',
  },
  {
    id: 'under-sink-leak',
    label: 'Leak under sink',
    shortDescription:
      'Water is pooling or dripping inside the cabinet below a sink.',
    urgencyCue: 'Act quickly',
  },
  {
    id: 'clogged-toilet',
    label: 'Clogged toilet',
    shortDescription:
      'The toilet is blocked, backing up, or close to overflowing.',
    urgencyCue: 'Priority help',
  },
  {
    id: 'slow-drain',
    label: 'Slow drain',
    shortDescription: 'Water drains slowly from a sink, tub, or shower.',
    urgencyCue: 'Good to catch early',
  },
  {
    id: 'shower-bath-leak',
    label: 'Shower or bath leak',
    shortDescription:
      'Water is leaking around a tub, shower fixture, or visible pipe.',
    urgencyCue: 'Prevent water damage',
  },
]);

export const supportedServiceAreaPostalCodes = [
  '10001',
  '10011',
  '11201',
  '11215',
] as const;

const scopeRules: Record<IssueTypeId, ScopeRuleDefinition> = {
  'dripping-faucet': {
    isInScope: (answerMap) => answerMap.singleFixture !== false,
    inScopeDetail:
      'The intake answers still match the supported single-fixture faucet path for the MVP.',
    outOfScopeDetail:
      'The faucet answers suggest the problem reaches beyond one contained fixture, so it should stay outside the standard MVP fulfillment path.',
  },
  'under-sink-leak': {
    isInScope: (answerMap) => answerMap.containedToSink !== false,
    inScopeDetail:
      'The intake answers still match the supported contained under-sink leak path for the MVP.',
    outOfScopeDetail:
      'The leak answers suggest the issue spreads beyond one sink area, so it should move to the recovery path instead of standard fulfillment.',
  },
  'clogged-toilet': {
    isInScope: (answerMap) =>
      answerMap.singleToiletAffected !== false &&
      answerMap.backupBeyondToilet !== true,
    inScopeDetail:
      'The intake answers still match the supported single-toilet blockage path for the MVP.',
    outOfScopeDetail:
      'The toilet answers suggest a broader blockage or backup condition, so it should stay outside the standard MVP fulfillment path.',
  },
  'slow-drain': {
    isInScope: (answerMap) => answerMap.singleDrainAffected !== false,
    inScopeDetail:
      'The intake answers still match the supported single-drain slowdown path for the MVP.',
    outOfScopeDetail:
      'The drain answers suggest multiple affected fixtures or a broader line issue, so it should move to the recovery path instead of standard fulfillment.',
  },
  'shower-bath-leak': {
    isInScope: (answerMap) => answerMap.containedToBathArea !== false,
    inScopeDetail:
      'The intake answers still match the supported contained bath or shower leak path for the MVP.',
    outOfScopeDetail:
      'The bath or shower answers suggest the leak extends beyond the contained fixture area, so it should stay outside the standard MVP fulfillment path.',
  },
};

export function buildAnswerMap(answers: ClarifyingAnswer[]) {
  return answers.reduce<AnswerMap>((accumulator, answer) => {
    accumulator[answer.questionId] = answer.value;
    return accumulator;
  }, {});
}

export function getScopeDecision(
  issueTypeId: IssueTypeId,
  answers: ClarifyingAnswer[],
) {
  const answerMap = buildAnswerMap(answers);
  const rule = scopeRules[issueTypeId];
  const isInScope = rule.isInScope(answerMap);

  return {
    isInScope,
    scopeDecisionLabel: isInScope
      ? 'Within supported plumbing scope'
      : 'Outside supported plumbing scope',
    scopeDecisionDetail: isInScope ? rule.inScopeDetail : rule.outOfScopeDetail,
  };
}

export function getCoverageDecision(postalCode: string) {
  const isInServiceArea = supportedServiceAreaPostalCodes.includes(
    postalCode as (typeof supportedServiceAreaPostalCodes)[number],
  );

  return {
    isInServiceArea,
    coverageDecisionLabel: isInServiceArea
      ? 'Inside active service area'
      : 'Outside active service area',
    coverageDecisionDetail: isInServiceArea
      ? `ZIP code ${postalCode} is inside the current Handrix service area.`
      : `ZIP code ${postalCode} is outside the current Handrix service area, so normal fulfillment should stay blocked.`,
  };
}
