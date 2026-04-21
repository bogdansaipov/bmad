import { useEffect, useState } from 'react'
import type { CreateRequestResponse, InternalSession } from '@handrix/shared-contracts'
import { IssueIntakeScreen } from '../features/issue-intake/issue-intake-screen'
import { OpsLoginScreen } from '../features/ops-queue/ops-login-screen'
import { OpsRequestDetailScreen } from '../features/ops-queue/ops-request-detail-screen'
import { OpsQueueScreen } from '../features/ops-queue/ops-queue-screen'
import {
  clearOpsSession,
  loadOpsSession,
  saveOpsSession,
} from '../features/ops-queue/ops-auth-storage'
import {
  getOpsRequestPublicId,
  getOpsRoute,
  isOpsPath,
} from '../features/ops-queue/ops-routes'
import { RequestTrackingScreen } from '../features/request-tracking/request-tracking-screen'
import {
  clearSavedTrackedRequest,
  loadSavedTrackedRequest,
  saveTrackedRequest,
  type SavedTrackedRequest,
} from '../features/request-tracking/request-tracking-storage'

export function App() {
  const [pathname, setPathname] = useState(() => window.location.pathname)
  const [opsSession, setOpsSession] = useState<InternalSession | null>(() => loadOpsSession())
  const [savedTrackedRequest, setSavedTrackedRequest] = useState<SavedTrackedRequest | null>(() =>
    loadSavedTrackedRequest(),
  )
  const [activeView, setActiveView] = useState<'intake' | 'tracking'>('intake')
  const [activeTrackedRequest, setActiveTrackedRequest] = useState<SavedTrackedRequest | null>(null)

  useEffect(() => {
    function handlePopState() {
      setPathname(window.location.pathname)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    if (pathname === '/ops/queue' && !opsSession && window.location.pathname !== '/ops/login') {
      window.history.replaceState(null, '', '/ops/login')
    }
  }, [opsSession, pathname])

  function navigateTo(nextPathname: string, replace = false) {
    const method = replace ? 'replaceState' : 'pushState'
    window.history[method](null, '', nextPathname)
    setPathname(nextPathname)
  }

  function handleRememberTrackedRequest(request: CreateRequestResponse) {
    const nextTrackedRequest = saveTrackedRequest(request)
    setSavedTrackedRequest(nextTrackedRequest)
  }

  function handleOpenTrackedRequest(request: CreateRequestResponse | SavedTrackedRequest) {
    const nextTrackedRequest =
      'trackingCredential' in request ? saveTrackedRequest(request) : request

    setSavedTrackedRequest(nextTrackedRequest)
    setActiveTrackedRequest(nextTrackedRequest)
    setActiveView('tracking')
  }

  function handleClearSavedTrackedRequest() {
    clearSavedTrackedRequest()
    setSavedTrackedRequest(null)
  }

  function handleOpsAuthenticated(session: InternalSession) {
    const nextSession = saveOpsSession(session)
    setOpsSession(nextSession)
    navigateTo('/ops/queue', true)
  }

  function handleOpsLogout() {
    clearOpsSession()
    setOpsSession(null)
    navigateTo('/ops/login', true)
  }

  function handleOpsSessionExpired() {
    clearOpsSession()
    setOpsSession(null)
    navigateTo('/ops/login', true)
  }

  function handleOpenOpsRequest(publicId: string) {
    navigateTo(`/ops/requests/${encodeURIComponent(publicId)}`)
  }

  const effectivePathname = pathname === '/ops/queue' && !opsSession ? '/ops/login' : pathname

  if (isOpsPath(effectivePathname)) {
    const opsRoute = getOpsRoute(effectivePathname)

    if (opsRoute === '/ops/queue' && opsSession) {
      return (
        <OpsQueueScreen
          session={opsSession}
          onOpenRequest={handleOpenOpsRequest}
          onLogout={handleOpsLogout}
          onSessionExpired={handleOpsSessionExpired}
        />
      )
    }

    const opsRequestPublicId = getOpsRequestPublicId(effectivePathname)

    if (opsRequestPublicId && opsSession) {
      return (
        <OpsRequestDetailScreen
          publicId={opsRequestPublicId}
          session={opsSession}
          onBack={() => navigateTo('/ops/queue', true)}
          onLogout={handleOpsLogout}
          onSessionExpired={handleOpsSessionExpired}
        />
      )
    }

    return <OpsLoginScreen onAuthenticated={handleOpsAuthenticated} />
  }

  if (activeView === 'tracking' && activeTrackedRequest) {
    return (
      <RequestTrackingScreen
        trackingSession={activeTrackedRequest}
        onBack={() => setActiveView('intake')}
        onClearSavedTracking={handleClearSavedTrackedRequest}
      />
    )
  }

  return (
    <IssueIntakeScreen
      savedTrackedRequest={savedTrackedRequest}
      onRememberTrackedRequest={handleRememberTrackedRequest}
      onOpenTracking={handleOpenTrackedRequest}
    />
  )
}
