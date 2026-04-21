import {
  apiErrorResponseSchema,
  opsQueueResponseSchema,
  type OpsQueueResponse,
} from '@handrix/shared-contracts'
import { getApiBaseUrl } from '../../lib/env'
import { OpsAuthError } from './ops-auth-api'

type OpsQueueApiResponse = {
  data: OpsQueueResponse
}

async function parseApiError(response: Response, fallbackMessage: string) {
  const payload = apiErrorResponseSchema.safeParse(await response.json())

  if (payload.success) {
    throw new OpsAuthError(
      payload.data.error.message,
      payload.data.error.recoveryHint,
      payload.data.error.code,
    )
  }

  throw new OpsAuthError(fallbackMessage)
}

export async function loadOpsQueue(
  accessToken: string,
  signal?: AbortSignal,
): Promise<OpsQueueResponse> {
  const response = await fetch(`${getApiBaseUrl()}/ops/queue`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    signal,
  })

  if (!response.ok) {
    await parseApiError(response, 'We could not load the live operations queue right now.')
  }

  const payload = (await response.json()) as OpsQueueApiResponse
  return opsQueueResponseSchema.parse(payload.data)
}
