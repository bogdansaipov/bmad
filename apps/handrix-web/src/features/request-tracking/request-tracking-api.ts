import {
  requestApiErrorResponseSchema,
  requestStatusLookupRequestSchema,
  requestStatusResponseSchema,
  type RequestStatusLookupRequest,
  type RequestStatusResponse,
} from '@handrix/shared-contracts'
import { getApiBaseUrl } from '../../lib/env'

type RequestStatusApiResponse = {
  data: RequestStatusResponse
}

export class RequestTrackingError extends Error {
  constructor(
    message: string,
    readonly recoveryHint?: string,
    readonly code?: string,
  ) {
    super(message)
    this.name = 'RequestTrackingError'
  }
}

export async function loadRequestStatus(
  request: RequestStatusLookupRequest,
  signal?: AbortSignal,
): Promise<RequestStatusResponse> {
  const requestBody = requestStatusLookupRequestSchema.parse(request)
  const response = await fetch(`${getApiBaseUrl()}/requests/status-lookups`, {
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
      throw new RequestTrackingError(
        payload.data.error.message,
        payload.data.error.recoveryHint,
        payload.data.error.code,
      )
    }

    throw new RequestTrackingError('We could not open that request status right now.')
  }

  const payload = (await response.json()) as RequestStatusApiResponse
  return requestStatusResponseSchema.parse(payload.data)
}
