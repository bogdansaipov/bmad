import { internalSessionSchema, type InternalSession } from '@handrix/shared-contracts'

const SUPPORT_SESSION_STORAGE_KEY = 'handrix.support.session'

export function loadSupportSession(): InternalSession | null {
  if (typeof window === 'undefined') {
    return null
  }

  const savedValue = window.localStorage.getItem(SUPPORT_SESSION_STORAGE_KEY)

  if (!savedValue) {
    return null
  }

  try {
    return internalSessionSchema.parse(JSON.parse(savedValue))
  } catch {
    window.localStorage.removeItem(SUPPORT_SESSION_STORAGE_KEY)
    return null
  }
}

export function saveSupportSession(session: InternalSession) {
  window.localStorage.setItem(SUPPORT_SESSION_STORAGE_KEY, JSON.stringify(session))
  return session
}

export function clearSupportSession() {
  window.localStorage.removeItem(SUPPORT_SESSION_STORAGE_KEY)
}
