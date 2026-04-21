import { useEffect, useState } from 'react'
import type {
  InternalOpsSession,
  InternalSession,
  OpsQueueItem,
  OpsQueueResponse,
} from '@handrix/shared-contracts'
import { loadOpsProtectedSession, OpsAuthError } from './ops-auth-api'
import { loadOpsQueue } from './ops-queue-api'

type OpsQueueScreenProps = {
  session: InternalSession
  onOpenRequest: (publicId: string) => void
  onSessionExpired: () => void
  onLogout: () => void
}

const REFRESH_INTERVAL_MS = 30_000

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function QueueItemCard({ item, onOpenRequest }: { item: OpsQueueItem; onOpenRequest: (publicId: string) => void }) {
  return (
    <article className={`ops-queue-item ops-queue-item--${item.queueState}`}>
      <div className="ops-queue-item__header">
        <p className="ops-queue-item__cue">{item.urgencyCue}</p>
        <p className="ops-queue-item__state">{item.queueStateLabel}</p>
      </div>

      <div className="ops-queue-item__body">
        <div className="ops-queue-item__identity">
          <h3>{item.issueLabel}</h3>
          <p>{item.addressSummary}</p>
        </div>

        <div className="ops-queue-item__meta">
          <p>
            <strong>Assignment:</strong> {item.assignmentStatusLabel}
          </p>
          {item.assignedOwnerLabel ? (
            <p>
              <strong>Owner:</strong> {item.assignedOwnerLabel}
            </p>
          ) : null}
          <p>
            <strong>Received:</strong> <time dateTime={item.receivedAt}>{formatTimestamp(item.receivedAt)}</time>
          </p>
          <p>
            <strong>Latest update:</strong> <time dateTime={item.updatedAt}>{formatTimestamp(item.updatedAt)}</time>
          </p>
        </div>
      </div>

      <p className="ops-queue-item__detail">{item.queueStateDetail}</p>
      {item.intervention ? (
        <div className="ops-queue-item__intervention">
          <p>
            <strong>{item.intervention.label}:</strong> {item.intervention.detail}
          </p>
          <p>{item.intervention.recommendedAction}</p>
        </div>
      ) : null}
      <p className="ops-queue-item__summary">{item.latestChangeSummary}</p>
      <button
        type="button"
        className="secondary-button ops-queue-item__open"
        onClick={() => onOpenRequest(item.publicId)}
      >
        Open request detail
      </button>
    </article>
  )
}

export function OpsQueueScreen({ session, onOpenRequest, onSessionExpired, onLogout }: OpsQueueScreenProps) {
  const [protectedSession, setProtectedSession] = useState<InternalOpsSession | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [queue, setQueue] = useState<OpsQueueResponse | null>(null)
  const [isQueueLoading, setIsQueueLoading] = useState(true)
  const [isRefreshingQueue, setIsRefreshingQueue] = useState(false)

  useEffect(() => {
    const abortController = new AbortController()

    async function loadProtectedSession() {
      try {
        const result = await loadOpsProtectedSession(
          session.accessToken,
          abortController.signal,
        )

        setProtectedSession(result)
        setErrorMessage(null)
      } catch (error) {
        if (abortController.signal.aborted) {
          return
        }

        if (error instanceof OpsAuthError) {
          setErrorMessage(error.message)
          onSessionExpired()
          return
        }

        setErrorMessage('We could not verify that protected session right now.')
      }
    }

    void loadProtectedSession()

    return () => abortController.abort()
  }, [onSessionExpired, session.accessToken])

  useEffect(() => {
    if (!protectedSession) {
      return
    }

    const abortController = new AbortController()

    async function refreshQueue(background = false) {
      if (background) {
        setIsRefreshingQueue(true)
      } else {
        setIsQueueLoading(true)
      }

      try {
        const nextQueue = await loadOpsQueue(session.accessToken, abortController.signal)
        setQueue(nextQueue)
        setErrorMessage(null)
      } catch (error) {
        if (abortController.signal.aborted) {
          return
        }

        if (error instanceof OpsAuthError) {
          setErrorMessage(error.message)
          onSessionExpired()
          return
        }

        setErrorMessage('We could not load the live operations queue right now.')
      } finally {
        setIsQueueLoading(false)
        setIsRefreshingQueue(false)
      }
    }

    void refreshQueue()

    const intervalId = window.setInterval(() => {
      void refreshQueue(true)
    }, REFRESH_INTERVAL_MS)

    return () => {
      abortController.abort()
      window.clearInterval(intervalId)
    }
  }, [onSessionExpired, protectedSession, session.accessToken])

  return (
    <main className="app-shell ops-page">
      <section className="ops-hero panel ops-hero--queue">
        <p className="eyebrow">Handrix Internal</p>
        <div className="hero-heading-row">
          <h1 className="hero-title hero-title--wide">Operations request queue</h1>
        </div>
        <p className="lede">
          Review incoming service requests quickly, keep blockers visible, and stay aligned with
          the customer-facing lifecycle.
        </p>
      </section>

      <section className="panel ops-queue-panel">
        {protectedSession ? (
          <>
            <div className="ops-queue-panel__header">
              <div className="ops-queue-panel__heading">
                <p className="ops-kicker">Access verified</p>
                <h2>{protectedSession.message}</h2>
                <p className="helper-copy">
                  Signed in as {protectedSession.user.displayName} ({protectedSession.user.role}).
                </p>
              </div>

              <button className="secondary-button" onClick={onLogout} type="button">
                Sign out
              </button>
            </div>

            {queue ? (
              <div className="ops-queue-summary" aria-label="Operations queue summary">
                <article className="ops-summary-card">
                  <p className="ops-summary-card__label">Active requests</p>
                  <strong>{queue.summary.totalActive}</strong>
                </article>
                <article className="ops-summary-card">
                  <p className="ops-summary-card__label">Needs attention</p>
                  <strong>{queue.summary.needsAttentionCount}</strong>
                </article>
                <article className="ops-summary-card">
                  <p className="ops-summary-card__label">Assigned</p>
                  <strong>{queue.summary.assignedCount}</strong>
                </article>
                <article className="ops-summary-card">
                  <p className="ops-summary-card__label">Blocked or unavailable</p>
                  <strong>{queue.summary.blockedCount + queue.summary.unavailableCount}</strong>
                </article>
              </div>
            ) : null}

            <div className="ops-queue-status-row">
              <div>
                <p className="ops-kicker">Live queue</p>
                <p className="helper-copy">
                  {queue
                    ? `Last refreshed ${formatTimestamp(queue.refreshedAt)}`
                    : 'Loading the current operations queue now.'}
                </p>
              </div>
              {isRefreshingQueue ? <p className="ops-refresh-indicator">Refreshing…</p> : null}
            </div>

            {isQueueLoading && !queue ? (
              <div className="ops-session-card" aria-live="polite">
                <p className="ops-kicker">Loading queue</p>
                <h3>Fetching active requests…</h3>
                <p>The queue will load in place once the current protected snapshot is ready.</p>
              </div>
            ) : null}

            {!isQueueLoading && queue?.items.length === 0 ? (
              <div className="ops-session-card" aria-live="polite">
                <p className="ops-kicker">Queue clear</p>
                <h3>No active requests need operations attention right now.</h3>
                <p>New requests will appear here automatically as the protected queue refreshes.</p>
              </div>
            ) : null}

            {queue?.items.length ? (
              <ol className="ops-queue-list" aria-label="Active operations requests">
                {queue.items.map((item) => (
                  <li key={item.publicId}>
                    <QueueItemCard item={item} onOpenRequest={onOpenRequest} />
                  </li>
                ))}
              </ol>
            ) : null}
          </>
        ) : (
          <>
            <p className="ops-kicker">Protected route</p>
            <h2>Verifying your operations session…</h2>
            <p className="helper-copy">
              The backend is checking your signed session before any internal request data is
              loaded.
            </p>
          </>
        )}

        {errorMessage ? (
          <div className="ops-alert" role="alert">
            <strong>{errorMessage}</strong>
            <p>
              {queue
                ? 'The last successful queue snapshot is still visible while the next refresh is retried.'
                : 'Sign in again to restore protected operations access.'}
            </p>
          </div>
        ) : null}

        {protectedSession ? (
          <div className="ops-session-card">
            <p>
              <strong>Email:</strong> {protectedSession.user.email}
            </p>
            <p>
              <strong>Session expires:</strong> {new Date(session.expiresAt).toLocaleString()}
            </p>
          </div>
        ) : null}
      </section>
    </main>
  )
}
