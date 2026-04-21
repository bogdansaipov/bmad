import {
  apiErrorResponseSchema,
  opsAssignRequestSchema,
  opsRequestDetailResponseSchema,
  opsUpdateRequestStatusSchema,
  type OpsAssignRequest,
  type OpsRequestDetailResponse,
  type OpsUpdateRequestStatus,
} from '@handrix/shared-contracts'
import { getApiBaseUrl } from '../../lib/env'
import { OpsAuthError } from './ops-auth-api'

type OpsRequestDetailApiResponse = {
  data: OpsRequestDetailResponse
}

export class OpsRequestDetailError extends Error {
  constructor(
    message: string,
    readonly recoveryHint?: string,
    readonly code?: string,
  ) {
    super(message)
    this.name = 'OpsRequestDetailError'
  }
}

async function parseApiError(response: Response, fallbackMessage: string) {
  const payload = apiErrorResponseSchema.safeParse(await response.json())

  if (payload.success) {
    const { code, message, recoveryHint } = payload.data.error

    if (
      code === 'INTERNAL_AUTH_UNAUTHORIZED' ||
      code === 'INTERNAL_AUTH_FORBIDDEN'
    ) {
      throw new OpsAuthError(message, recoveryHint, code)
    }

    throw new OpsRequestDetailError(message, recoveryHint, code)
  }

  throw new OpsRequestDetailError(fallbackMessage)
}

export async function loadOpsRequestDetail(
  accessToken: string,
  publicId: string,
  signal?: AbortSignal,
): Promise<OpsRequestDetailResponse> {
  const response = await fetch(`${getApiBaseUrl()}/ops/requests/${publicId}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    signal,
  })

  if (!response.ok) {
    await parseApiError(response, 'We could not open that operations request right now.')
  }

  const payload = (await response.json()) as OpsRequestDetailApiResponse
  return opsRequestDetailResponseSchema.parse(payload.data)
}

export async function assignOpsRequest(
  accessToken: string,
  publicId: string,
  request: OpsAssignRequest,
  signal?: AbortSignal,
): Promise<OpsRequestDetailResponse> {
  const payload = opsAssignRequestSchema.parse(request)
  const response = await fetch(`${getApiBaseUrl()}/ops/requests/${publicId}/assignments`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal,
  })

  if (!response.ok) {
    await parseApiError(response, 'We could not assign that fulfillment owner right now.')
  }

  const responsePayload = (await response.json()) as OpsRequestDetailApiResponse
  return opsRequestDetailResponseSchema.parse(responsePayload.data)
}

export async function updateOpsRequestStatus(
  accessToken: string,
  publicId: string,
  request: OpsUpdateRequestStatus,
  signal?: AbortSignal,
): Promise<OpsRequestDetailResponse> {
  const payload = opsUpdateRequestStatusSchema.parse(request)
  const response = await fetch(`${getApiBaseUrl()}/ops/requests/${publicId}/status`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal,
  })

  if (!response.ok) {
    await parseApiError(response, 'We could not apply that lifecycle update right now.')
  }

  const responsePayload = (await response.json()) as OpsRequestDetailApiResponse
  return opsRequestDetailResponseSchema.parse(responsePayload.data)
}
