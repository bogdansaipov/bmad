import type { InternalSession } from '@handrix/shared-contracts'

const OPS_SESSION_STORAGE_KEY = 'handrix.ops.session'

export function loadOpsSession(): InternalSession | null {
  if (typeof window === 'undefined') {
    return null
  }

  const savedValue = window.localStorage.getItem(OPS_SESSION_STORAGE_KEY)

  if (!savedValue) {
    return null
  }

  try {
    return JSON.parse(savedValue) as InternalSession
  } catch {
    window.localStorage.removeItem(OPS_SESSION_STORAGE_KEY)
    return null
  }
}

export function saveOpsSession(session: InternalSession) {
  window.localStorage.setItem(OPS_SESSION_STORAGE_KEY, JSON.stringify(session))
  return session
}

export function clearOpsSession() {
  window.localStorage.removeItem(OPS_SESSION_STORAGE_KEY)
}
