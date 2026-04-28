import { OBSERVABILITY_EVENT_NAMES } from '@handrix/shared-contracts'
import { getApiBaseUrl } from '../../lib/env'

const FLOW_SESSION_STORAGE_KEY = 'handrix.intake.flow-session-id'

function createSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `fs-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function resolveFlowSessionId(): string | undefined {
  if (typeof sessionStorage === 'undefined') {
    return undefined
  }

  try {
    const existing = sessionStorage.getItem(FLOW_SESSION_STORAGE_KEY)

    if (existing && existing.length > 0) {
      return existing
    }

    const nextSessionId = createSessionId()
    sessionStorage.setItem(FLOW_SESSION_STORAGE_KEY, nextSessionId)
    return nextSessionId
  } catch {
    return undefined
  }
}

export async function reportFlowStarted(): Promise<void> {
  try {
    const sessionId = resolveFlowSessionId()

    await fetch(`${getApiBaseUrl()}/requests/events`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventName: OBSERVABILITY_EVENT_NAMES.flowStarted,
        ...(sessionId ? { sessionId } : {}),
      }),
      keepalive: true,
    })
  } catch {
    // Fire-and-forget — intentionally swallow errors so UX is never blocked.
  }
}
