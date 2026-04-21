import {
  apiErrorResponseSchema,
  internalAuthRequestSchema,
  internalSessionSchema,
  internalSupportSessionSchema,
  type InternalAuthRequest,
  type InternalSession,
  type InternalSupportSession,
} from '@handrix/shared-contracts'
import { getApiBaseUrl } from '../../lib/env'

type InternalSessionApiResponse = {
  data: InternalSession
}

type InternalSupportSessionApiResponse = {
  data: InternalSupportSession
}

export class SupportAuthError extends Error {
  constructor(
    message: string,
    readonly recoveryHint?: string,
    readonly code?: string,
  ) {
    super(message)
    this.name = 'SupportAuthError'
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

async function readJsonBody(response: Response): Promise<unknown | null> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

async function parseApiError(response: Response, fallbackMessage: string) {
  const body = await readJsonBody(response)
  const payload = body === null ? null : apiErrorResponseSchema.safeParse(body)

  if (payload && payload.success) {
    throw new SupportAuthError(
      payload.data.error.message,
      payload.data.error.recoveryHint,
      payload.data.error.code,
    )
  }

  throw new SupportAuthError(fallbackMessage)
}

export async function createInternalSession(
  request: InternalAuthRequest,
  signal?: AbortSignal,
): Promise<InternalSession> {
  const requestBody = internalAuthRequestSchema.parse(request)
  const fallbackMessage = 'We could not start that staff session right now.'

  let response: Response
  try {
    response = await fetch(`${getApiBaseUrl()}/auth/internal-sessions`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal,
    })
  } catch (error) {
    if (isAbortError(error)) {
      throw error
    }
    throw new SupportAuthError(fallbackMessage)
  }

  if (!response.ok) {
    await parseApiError(response, fallbackMessage)
  }

  const body = await readJsonBody(response)
  if (body === null) {
    throw new SupportAuthError(fallbackMessage)
  }

  const parsed = internalSessionSchema.safeParse(
    (body as InternalSessionApiResponse).data,
  )
  if (!parsed.success) {
    throw new SupportAuthError(fallbackMessage)
  }
  return parsed.data
}

export async function loadSupportProtectedSession(
  accessToken: string,
  signal?: AbortSignal,
): Promise<InternalSupportSession> {
  const fallbackMessage =
    'We could not open the protected support workspace right now.'

  let response: Response
  try {
    response = await fetch(`${getApiBaseUrl()}/support/session`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      signal,
    })
  } catch (error) {
    if (isAbortError(error)) {
      throw error
    }
    throw new SupportAuthError(fallbackMessage)
  }

  if (!response.ok) {
    await parseApiError(response, fallbackMessage)
  }

  const body = await readJsonBody(response)
  if (body === null) {
    throw new SupportAuthError(fallbackMessage)
  }

  const parsed = internalSupportSessionSchema.safeParse(
    (body as InternalSupportSessionApiResponse).data,
  )
  if (!parsed.success) {
    throw new SupportAuthError(fallbackMessage)
  }
  return parsed.data
}
