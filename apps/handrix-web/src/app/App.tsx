import { useCallback, useEffect, useState } from 'react'
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
import {
  clearSupportSession,
  loadSupportSession,
  saveSupportSession,
} from '../features/support-request-view/support-auth-storage'
import {
  getSupportRequestPublicId,
  getSupportRoute,
  isSupportPath,
} from '../features/support-request-view/support-routes'
import { SupportLoginScreen } from '../features/support-request-view/support-login-screen'
import { SupportRequestDetailScreen } from '../features/support-request-view/support-request-detail-screen'
import { SupportWorkspaceScreen } from '../features/support-request-view/support-workspace-screen'
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
  const [supportSession, setSupportSession] = useState<InternalSession | null>(() =>
    loadSupportSession(),
  )
  const [supportLoginMessage, setSupportLoginMessage] = useState<{
    message: string
    recoveryHint: string | null
  } | null>(null)
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

  useEffect(() => {
    const needsSupportLoginRedirect =
      (pathname === '/support/workspace' ||
        pathname.startsWith('/support/requests/')) &&
      !supportSession &&
      window.location.pathname !== '/support/login'

    if (needsSupportLoginRedirect) {
      window.history.replaceState(null, '', '/support/login')
    }
  }, [supportSession, pathname])

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

  function handleOpenSupportRequest(publicId: string) {
    navigateTo(`/support/requests/${encodeURIComponent(publicId)}`)
  }

  function handleSupportAuthenticated(session: InternalSession) {
    const nextSession = saveSupportSession(session)
    setSupportSession(nextSession)
    setSupportLoginMessage(null)
    navigateTo('/support/workspace', true)
  }

  function handleSupportLogout() {
    clearSupportSession()
    setSupportSession(null)
    setSupportLoginMessage(null)
    navigateTo('/support/login', true)
  }

  const handleSupportSessionExpired = useCallback(
    (reason?: { message: string; recoveryHint?: string | null }) => {
      clearSupportSession()
      setSupportSession(null)
      setSupportLoginMessage(
        reason
          ? {
              message: reason.message,
              recoveryHint: reason.recoveryHint ?? null,
            }
          : null,
      )
      window.history.replaceState(null, '', '/support/login')
      setPathname('/support/login')
    },
    [],
  )

  const needsSupportLoginFallback =
    (pathname === '/support/workspace' ||
      pathname.startsWith('/support/requests/')) &&
    !supportSession

  const effectivePathname =
    pathname === '/ops/queue' && !opsSession
      ? '/ops/login'
      : needsSupportLoginFallback
        ? '/support/login'
        : pathname

  if (isSupportPath(effectivePathname)) {
    const supportRoute = getSupportRoute(effectivePathname)
    const supportRequestPublicId = getSupportRequestPublicId(effectivePathname)

    if (supportRoute === '/support/workspace' && supportSession) {
      return (
        <SupportWorkspaceScreen
          session={supportSession}
          onLogout={handleSupportLogout}
          onOpenRequest={handleOpenSupportRequest}
          onSessionExpired={handleSupportSessionExpired}
        />
      )
    }

    if (supportRequestPublicId && supportSession) {
      return (
        <SupportRequestDetailScreen
          publicId={supportRequestPublicId}
          session={supportSession}
          onBack={() => navigateTo('/support/workspace', true)}
          onLogout={handleSupportLogout}
          onSessionExpired={handleSupportSessionExpired}
        />
      )
    }

    return (
      <SupportLoginScreen
        onAuthenticated={handleSupportAuthenticated}
        initialErrorMessage={supportLoginMessage?.message ?? null}
        initialRecoveryHint={supportLoginMessage?.recoveryHint ?? null}
      />
    )
  }

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
