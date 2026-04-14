import {
  requestReviewRequestSchema,
  requestReviewSummarySchema,
  type RequestReviewRequest,
  type RequestReviewSummary,
} from '@handrix/shared-contracts'
import { getApiBaseUrl } from '../../lib/env'

type RequestReviewSummaryResponse = {
  data: RequestReviewSummary
}

export async function loadRequestReviewSummary(
  request: RequestReviewRequest,
  signal?: AbortSignal,
): Promise<RequestReviewSummary> {
  const requestBody = requestReviewRequestSchema.parse(request)
  const response = await fetch(`${getApiBaseUrl()}/requests/review-summaries`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
    signal,
  })

  if (!response.ok) {
    throw new Error('Unable to load the request review summary.')
  }

  const payload = (await response.json()) as RequestReviewSummaryResponse
  return requestReviewSummarySchema.parse(payload.data)
}
