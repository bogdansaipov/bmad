import {
  createRequestRequestSchema,
  createRequestResponseSchema,
  requestApiErrorResponseSchema,
  type CreateRequestRequest,
  type CreateRequestResponse,
} from '@handrix/shared-contracts'
import { getApiBaseUrl } from '../../lib/env'

type CreateRequestApiResponse = {
  data: CreateRequestResponse
}

export class RequestConfirmationError extends Error {
  constructor(
    message: string,
    readonly recoveryHint?: string,
    readonly code?: string,
  ) {
    super(message)
    this.name = 'RequestConfirmationError'
  }
}

export async function submitAnonymousRequest(
  request: CreateRequestRequest,
  signal?: AbortSignal,
): Promise<CreateRequestResponse> {
  const requestBody = createRequestRequestSchema.parse(request)
  const response = await fetch(`${getApiBaseUrl()}/requests`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
    signal,
  })

  if (!response.ok) {
    const payload = requestApiErrorResponseSchema.safeParse(await response.json())

    if (payload.success) {
      throw new RequestConfirmationError(
        payload.data.error.message,
        payload.data.error.recoveryHint,
        payload.data.error.code,
      )
    }

    throw new RequestConfirmationError('We could not confirm the request right now.')
  }

  const payload = (await response.json()) as CreateRequestApiResponse
  return createRequestResponseSchema.parse(payload.data)
}
