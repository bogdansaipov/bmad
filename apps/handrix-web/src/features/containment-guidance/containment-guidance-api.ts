import {
  containmentGuidanceRequestSchema,
  containmentGuidanceSchema,
  type ContainmentGuidance,
  type ContainmentGuidanceRequest,
  type IssueType,
} from '@handrix/shared-contracts'
import { getApiBaseUrl } from '../../lib/env'

type ContainmentGuidanceResponse = {
  data: ContainmentGuidance
}

export async function loadContainmentGuidance(
  issueTypeId: IssueType['id'],
  request: ContainmentGuidanceRequest,
  signal?: AbortSignal,
): Promise<ContainmentGuidance> {
  const query = containmentGuidanceRequestSchema.parse(request)
  const params = new URLSearchParams({
    serviceabilityStatus: query.serviceabilityStatus,
    nextStep: query.nextStep,
  })

  if (query.recoveryCode) {
    params.set('recoveryCode', query.recoveryCode)
  }

  const response = await fetch(
    `${getApiBaseUrl()}/reference-data/containment-guidance/${issueTypeId}?${params.toString()}`,
    {
      headers: {
        Accept: 'application/json',
      },
      signal,
    },
  )

  if (!response.ok) {
    throw new Error('Unable to load containment guidance.')
  }

  const payload = (await response.json()) as ContainmentGuidanceResponse
  return containmentGuidanceSchema.parse(payload.data)
}
