import {
  supportRequestSearchResponseSchema,
  type SupportRequestSearchResponse,
} from '@handrix/shared-contracts'
import { getApiBaseUrl } from '../../lib/env'
import { SupportAuthError } from './support-auth-api'

type SupportSearchApiResponse = {
  data: SupportRequestSearchResponse
}

type SearchSupportRequestsInput = {
  q?: string
  limit?: number
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

  if (
    body &&
    typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof (body as { error: unknown }).error === 'object'
  ) {
    const errorBody = (body as { error: { code?: string; message?: string; recoveryHint?: string } }).error
    if (errorBody && typeof errorBody.message === 'string') {
      throw new SupportAuthError(
        errorBody.message,
        errorBody.recoveryHint,
        errorBody.code,
      )
    }
  }

  throw new SupportAuthError(fallbackMessage)
}

export async function searchSupportRequests(
  accessToken: string,
  input: SearchSupportRequestsInput,
  signal?: AbortSignal,
): Promise<SupportRequestSearchResponse> {
  const fallbackMessage = 'We could not run that support search right now.'

  const params = new URLSearchParams()
  if (typeof input.q === 'string' && input.q.length > 0) {
    params.set('q', input.q)
  }
  if (typeof input.limit === 'number' && Number.isFinite(input.limit)) {
    params.set('limit', String(input.limit))
  }
  const queryString = params.toString()
  const url = `${getApiBaseUrl()}/support/requests${queryString ? `?${queryString}` : ''}`

  let response: Response
  try {
    response = await fetch(url, {
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

  const parsed = supportRequestSearchResponseSchema.safeParse(
    (body as SupportSearchApiResponse).data,
  )
  if (!parsed.success) {
    throw new SupportAuthError(fallbackMessage)
  }

  return parsed.data
}
