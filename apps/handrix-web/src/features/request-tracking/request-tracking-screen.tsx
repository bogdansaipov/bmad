import { useEffect, useState } from 'react'
import type { RequestStatusResponse } from '@handrix/shared-contracts'
import {
  RequestTrackingError,
  loadRequestStatus,
} from './request-tracking-api'
import type { SavedTrackedRequest } from './request-tracking-storage'

type RequestTrackingScreenProps = {
  trackingSession: SavedTrackedRequest
  onBack: () => void
  onClearSavedTracking: () => void
}

type TrackingLoadState = 'loading' | 'ready' | 'error'

const REFRESH_INTERVAL_MS = 30_000

function isRecoveryStatus(requestStatus: RequestStatusResponse) {
  return requestStatus.recoveryState != null
}

function formatStatusTimestamp(timestamp: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp))
}

function getTimelineAnnouncement(
  previousStatus: RequestStatusResponse | null,
  nextStatus: RequestStatusResponse,
) {
  if (!previousStatus) {
    return `Latest update: ${nextStatus.latestChangeSummary}`
  }

  const previousCurrentEntry = previousStatus.timeline.find((entry) => entry.isCurrent)
  const nextCurrentEntry = nextStatus.timeline.find((entry) => entry.isCurrent)

  if (
    previousCurrentEntry?.publicStatus !== nextCurrentEntry?.publicStatus ||
    previousStatus.updatedAt !== nextStatus.updatedAt
  ) {
    if (isRecoveryStatus(nextStatus) && nextStatus.recoveryState) {
      return `Updated: ${nextStatus.recoveryState.title}`
    }

    return `Updated: ${nextStatus.latestChangeSummary}`
  }

  return `Still current as of ${formatStatusTimestamp(nextStatus.updatedAt)}`
}

export function RequestTrackingScreen({
  trackingSession,
  onBack,
  onClearSavedTracking,
}: RequestTrackingScreenProps) {
  const [status, setStatus] = useState<TrackingLoadState>('loading')
  const [requestStatus, setRequestStatus] = useState<RequestStatusResponse | null>(null)
  const [trackingError, setTrackingError] = useState('')
  const [trackingRecoveryHint, setTrackingRecoveryHint] = useState('')
  const [refreshStatus, setRefreshStatus] = useState('Checking for the latest progress...')
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    let refreshTimer: ReturnType<typeof setTimeout> | null = null
    let latestStatus: RequestStatusResponse | null = null

    async function fetchTrackedRequest(isBackgroundRefresh: boolean) {
      if (!isBackgroundRefresh) {
        setStatus('loading')
        setRequestStatus(null)
        setTrackingError('')
        setTrackingRecoveryHint('')
        setRefreshStatus('Checking for the latest progress...')
      } else {
        setIsRefreshing(true)
      }

      try {
        const previousStatus = latestStatus
        const nextRequestStatus = await loadRequestStatus(
          {
            publicId: trackingSession.publicId,
            trackingToken: trackingSession.trackingToken,
          },
          controller.signal,
        )

        setRefreshStatus(getTimelineAnnouncement(previousStatus, nextRequestStatus))
        latestStatus = nextRequestStatus
        setRequestStatus(nextRequestStatus)
        setStatus('ready')
        setTrackingError('')
        setTrackingRecoveryHint('')
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        if (error instanceof RequestTrackingError) {
          if (error.code === 'REQUEST_STATUS_LOOKUP_REJECTED') {
            setStatus('error')
            setTrackingError(error.message)
            setTrackingRecoveryHint(
              error.recoveryHint ??
                'Please return using the latest request confirmation details and try again.',
            )
            setRequestStatus(null)
            onClearSavedTracking()
            return
          }

          if (isBackgroundRefresh && latestStatus) {
            setRefreshStatus(
              'This screen is still showing the latest saved update while we retry quietly in the background.',
            )
            return
          }

          setStatus('error')
          setTrackingError(error.message)
          setTrackingRecoveryHint(
            error.recoveryHint ??
              'Please return using the latest request confirmation details and try again.',
          )
          return
        }

        if (isBackgroundRefresh && latestStatus) {
          setRefreshStatus(
            'This screen is still showing the latest saved update while we retry quietly in the background.',
          )
          return
        }

        setStatus('error')
        setTrackingError('We could not open that request status right now.')
        setTrackingRecoveryHint(
          'Please try again in a moment using the same confirmation details.',
        )
      } finally {
        setIsRefreshing(false)

        if (!controller.signal.aborted) {
          refreshTimer = setTimeout(() => {
            void fetchTrackedRequest(true)
          }, REFRESH_INTERVAL_MS)
        }
      }
    }

    void fetchTrackedRequest(false)

    return () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer)
      }

      controller.abort()
    }
  }, [onClearSavedTracking, trackingSession.publicId, trackingSession.trackingToken])

  return (
    <main className="app-shell issue-intake-page">
      <section className="intake-hero intake-hero--confirmation">
        <p className="eyebrow">Handrix urgent plumbing help</p>
        <div className="hero-heading-row">
          <span className="progress-pill">Request tracking</span>
        </div>
        <h1 className="hero-title hero-title--wide">Check your request status.</h1>
        <p className="lede">
          Handrix can reopen the latest saved request on this device without asking you to
          create an account.
        </p>
        <p className="support-copy">
          We&apos;ll show the current customer-safe status, the latest update time, and
          what happens next.
        </p>
      </section>

      <section className="issue-grid-section" aria-label="Request status tracking">
        {status === 'loading' ? (
          <section className="panel review-panel tracking-panel" aria-live="polite">
            Loading your request status...
          </section>
        ) : null}

        {status === 'error' ? (
          <section
            className="panel review-panel tracking-panel tracking-panel--recovery"
            aria-live="polite"
          >
            <p className="next-step-kicker">Request status unavailable</p>
            <h2>We couldn&apos;t reopen that request status right now.</h2>
            <p className="guided-copy">{trackingError}</p>
            <p className="helper-copy">{trackingRecoveryHint}</p>

            <div className="action-row">
              <button type="button" className="secondary-action" onClick={onBack}>
                Back to issue list
              </button>
            </div>
          </section>
        ) : null}

        {status === 'ready' && requestStatus ? (
          <section className="panel review-panel tracking-panel" aria-live="polite">
            <p className="next-step-kicker">Current status</p>
            <h2>{requestStatus.publicStatusLabel}</h2>
            <p className="guided-copy">{requestStatus.publicStatusDetail}</p>

            <div className="tracking-refresh-card" aria-live="polite">
              <p className="next-step-kicker">Live progress</p>
              <p className="guided-copy">{refreshStatus}</p>
              <p className="helper-copy">
                {isRefreshing
                  ? 'Checking quietly for the next update without interrupting this screen.'
                  : `Latest update: ${formatStatusTimestamp(requestStatus.updatedAt)}`}
              </p>
            </div>

            <div className="review-sections tracking-panel__sections">
              <article className="review-section-card confirmation-status-card">
                <p className="next-step-kicker">Request summary</p>
                <h3>{requestStatus.issueLabel}</h3>
                <div className="tracking-panel__meta" aria-label="Tracked request details">
                  <div className="response-summary__item">
                    <span className="response-summary__question">Request ID</span>
                    <span className="response-summary__answer">{requestStatus.publicId}</span>
                  </div>
                  <div className="response-summary__item">
                    <span className="response-summary__question">Created</span>
                    <span className="response-summary__answer">
                      {formatStatusTimestamp(requestStatus.createdAt)}
                    </span>
                  </div>
                  <div className="response-summary__item">
                    <span className="response-summary__question">Last updated</span>
                    <span className="response-summary__answer">
                      {formatStatusTimestamp(requestStatus.updatedAt)}
                    </span>
                  </div>
                </div>
              </article>

              {requestStatus.recoveryState ? (
                <article
                  className={`review-section-card tracking-recovery-card tracking-recovery-card--${requestStatus.recoveryState.kind}`}
                >
                  <p className="next-step-kicker">Recovery update</p>
                  <h3>{requestStatus.recoveryState.title}</h3>
                  <p className="guided-copy">{requestStatus.recoveryState.detail}</p>
                  <div className="tracking-recovery-card__grid">
                    <div>
                      <p className="tracking-recovery-card__label">What changed</p>
                      <p className="helper-copy">{requestStatus.latestChangeSummary}</p>
                    </div>
                    <div>
                      <p className="tracking-recovery-card__label">Expectation update</p>
                      <p className="helper-copy">
                        {requestStatus.recoveryState.expectationUpdate}
                      </p>
                    </div>
                    <div>
                      <p className="tracking-recovery-card__label">
                        {requestStatus.recoveryState.nextActionLabel}
                      </p>
                      <p className="helper-copy">
                        {requestStatus.recoveryState.nextActionDetail}
                      </p>
                    </div>
                    {requestStatus.recoveryState.fallbackGuidance ? (
                      <div>
                        <p className="tracking-recovery-card__label">Fallback guidance</p>
                        <p className="helper-copy">
                          {requestStatus.recoveryState.fallbackGuidance}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </article>
              ) : null}

              <article className="review-section-card tracking-timeline-card">
                <p className="next-step-kicker">Progress timeline</p>
                <div className="tracking-timeline" aria-label="Request progress timeline">
                  {requestStatus.timeline.map((entry) => (
                    <section
                      key={`${entry.publicStatus}-${entry.happenedAt}`}
                      className={`tracking-timeline__item${
                        entry.isCurrent ? ' tracking-timeline__item--current' : ''
                      }`}
                    >
                      <div className="tracking-timeline__marker" aria-hidden="true" />
                      <div className="tracking-timeline__content">
                        <p className="tracking-timeline__eyebrow">
                          {entry.isCurrent ? 'Current step' : 'Completed step'}
                        </p>
                        <h3>{entry.publicStatusLabel}</h3>
                        <p className="guided-copy">{entry.publicStatusDetail}</p>
                        <p className="helper-copy">{entry.changeSummary}</p>
                        <p className="tracking-timeline__timestamp">
                          {formatStatusTimestamp(entry.happenedAt)}
                        </p>
                      </div>
                    </section>
                  ))}
                </div>
              </article>

              <article className="review-next-steps">
                <p className="next-step-kicker">
                  {requestStatus.recoveryState ? 'Next best action' : 'What happens next'}
                </p>
                <p className="guided-copy">{requestStatus.nextStepDetail}</p>
                <p className="helper-copy">
                  {requestStatus.recoveryState?.fallbackGuidance ??
                    requestStatus.latestChangeSummary}
                </p>
              </article>
            </div>

            <div className="action-row">
              <button type="button" className="secondary-action" onClick={onBack}>
                Back to issue list
              </button>
            </div>
          </section>
        ) : null}
      </section>
    </main>
  )
}
