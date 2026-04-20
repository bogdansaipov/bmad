import { useState } from 'react'
import type { CreateRequestResponse } from '@handrix/shared-contracts'
import { IssueIntakeScreen } from '../features/issue-intake/issue-intake-screen'
import { RequestTrackingScreen } from '../features/request-tracking/request-tracking-screen'
import {
  clearSavedTrackedRequest,
  loadSavedTrackedRequest,
  saveTrackedRequest,
  type SavedTrackedRequest,
} from '../features/request-tracking/request-tracking-storage'

export function App() {
  const [savedTrackedRequest, setSavedTrackedRequest] = useState<SavedTrackedRequest | null>(() =>
    loadSavedTrackedRequest(),
  )
  const [activeView, setActiveView] = useState<'intake' | 'tracking'>('intake')
  const [activeTrackedRequest, setActiveTrackedRequest] = useState<SavedTrackedRequest | null>(null)

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
