import {
  apiErrorResponseSchema,
  internalAuthRequestSchema,
  internalOpsSessionSchema,
  internalSessionSchema,
  type InternalAuthRequest,
  type InternalOpsSession,
  type InternalSession,
} from '@handrix/shared-contracts'
import { getApiBaseUrl } from '../../lib/env'

type InternalSessionApiResponse = {
  data: InternalSession
}

type InternalOpsSessionApiResponse = {
  data: InternalOpsSession
}

export class OpsAuthError extends Error {
  constructor(
    message: string,
    readonly recoveryHint?: string,
    readonly code?: string,
  ) {
    super(message)
    this.name = 'OpsAuthError'
  }
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

export async function createInternalSession(
  request: InternalAuthRequest,
  signal?: AbortSignal,
): Promise<InternalSession> {
  const requestBody = internalAuthRequestSchema.parse(request)
  const response = await fetch(`${getApiBaseUrl()}/auth/internal-sessions`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
    signal,
  })

  if (!response.ok) {
    await parseApiError(response, 'We could not start that staff session right now.')
  }

  const payload = (await response.json()) as InternalSessionApiResponse
  return internalSessionSchema.parse(payload.data)
}

export async function loadOpsProtectedSession(
  accessToken: string,
  signal?: AbortSignal,
): Promise<InternalOpsSession> {
  const response = await fetch(`${getApiBaseUrl()}/ops/session`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    signal,
  })

  if (!response.ok) {
    await parseApiError(response, 'We could not open the protected operations area right now.')
  }

  const payload = (await response.json()) as InternalOpsSessionApiResponse
  return internalOpsSessionSchema.parse(payload.data)
}
