import {
  evaluateIntakeRequestSchema,
  intakeClassificationSchema,
  intakeQuestionSetSchema,
  issueTypeListSchema,
  type EvaluateIntakeRequest,
  type IntakeClassification,
  type IntakeQuestionSet,
  type IssueType,
} from '@handrix/shared-contracts'
import { getApiBaseUrl } from '../../lib/env'

type IssueTypesResponse = {
  data: IssueType[]
}

type IntakeQuestionSetResponse = {
  data: IntakeQuestionSet
}

type IntakeEvaluationResponse = {
  data: IntakeClassification
}

export async function loadIssueTypes(signal?: AbortSignal): Promise<IssueType[]> {
  const response = await fetch(`${getApiBaseUrl()}/reference-data/issue-types`, {
    headers: {
      Accept: 'application/json',
    },
    signal,
  })

  if (!response.ok) {
    throw new Error('Unable to load supported issue types.')
  }

  const payload = (await response.json()) as IssueTypesResponse
  return issueTypeListSchema.parse(payload.data)
}

export async function loadIntakeQuestionSet(
  issueTypeId: IssueType['id'],
  signal?: AbortSignal,
): Promise<IntakeQuestionSet> {
  const response = await fetch(
    `${getApiBaseUrl()}/reference-data/intake-question-sets/${issueTypeId}`,
    {
      headers: {
        Accept: 'application/json',
      },
      signal,
    },
  )

  if (!response.ok) {
    throw new Error('Unable to load follow-up questions.')
  }

  const payload = (await response.json()) as IntakeQuestionSetResponse
  return intakeQuestionSetSchema.parse(payload.data)
}

export async function evaluateIntake(
  intakeRequest: EvaluateIntakeRequest,
  signal?: AbortSignal,
): Promise<IntakeClassification> {
  const requestBody = evaluateIntakeRequestSchema.parse(intakeRequest)
  const response = await fetch(`${getApiBaseUrl()}/requests/intake-evaluations`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
    signal,
  })

  if (!response.ok) {
    throw new Error('Unable to evaluate intake details.')
  }

  const payload = (await response.json()) as IntakeEvaluationResponse
  return intakeClassificationSchema.parse(payload.data)
}
