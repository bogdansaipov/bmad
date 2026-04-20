import type { CreateRequestResponse } from '@handrix/shared-contracts'

const SAVED_REQUEST_TRACKING_KEY = 'handrix.latestTrackedRequest'

export type SavedTrackedRequest = {
  publicId: string
  issueLabel: string
  trackingToken: string
  trackingExpiresAt: string
}

export function loadSavedTrackedRequest(): SavedTrackedRequest | null {
  if (typeof window === 'undefined') {
    return null
  }

  const rawValue = window.localStorage.getItem(SAVED_REQUEST_TRACKING_KEY)

  if (!rawValue) {
    return null
  }

  try {
    const parsed = JSON.parse(rawValue) as SavedTrackedRequest

    if (
      typeof parsed.publicId !== 'string' ||
      typeof parsed.issueLabel !== 'string' ||
      typeof parsed.trackingToken !== 'string' ||
      typeof parsed.trackingExpiresAt !== 'string'
    ) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

export function saveTrackedRequest(
  request: CreateRequestResponse,
): SavedTrackedRequest | null {
  if (typeof window === 'undefined') {
    return null
  }

  const trackedRequest: SavedTrackedRequest = {
    publicId: request.publicId,
    issueLabel: request.issueLabel,
    trackingToken: request.trackingCredential.token,
    trackingExpiresAt: request.trackingCredential.expiresAt,
  }

  window.localStorage.setItem(
    SAVED_REQUEST_TRACKING_KEY,
    JSON.stringify(trackedRequest),
  )

  return trackedRequest
}

export function clearSavedTrackedRequest() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(SAVED_REQUEST_TRACKING_KEY)
}
