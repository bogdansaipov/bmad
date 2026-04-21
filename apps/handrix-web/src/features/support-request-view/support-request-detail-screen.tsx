import { useCallback, useEffect, useState } from 'react'
import type {
  InternalSession,
  InternalSupportSession,
  SupportRequestDetailResponse,
} from '@handrix/shared-contracts'
import { loadSupportProtectedSession, SupportAuthError } from './support-auth-api'
import { loadSupportRequestDetail } from './support-request-detail-api'

type SupportRequestDetailScreenProps = {
  publicId: string
  session: InternalSession
  onBack: () => void
  onLogout: () => void
  onSessionExpired: (reason?: { message: string; recoveryHint?: string | null }) => void
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function SupportRequestDetailScreen({
  publicId,
  session,
  onBack,
  onLogout,
  onSessionExpired,
}: SupportRequestDetailScreenProps) {
  const [protectedSession, setProtectedSession] = useState<InternalSupportSession | null>(null)
  const [requestDetail, setRequestDetail] = useState<SupportRequestDetailResponse | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [errorRecoveryHint, setErrorRecoveryHint] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const handleSessionExpired = useCallback(
    (error: SupportAuthError) => {
      onSessionExpired({
        message: error.message,
        recoveryHint: error.recoveryHint ?? null,
      })
    },
    [onSessionExpired],
  )

  useEffect(() => {
    const abortController = new AbortController()

    async function loadDetail() {
      setIsLoading(true)

      try {
        const verifiedSession = await loadSupportProtectedSession(
          session.accessToken,
          abortController.signal,
        )
        setProtectedSession(verifiedSession)

        const detail = await loadSupportRequestDetail(
          session.accessToken,
          publicId,
          abortController.signal,
        )
        setRequestDetail(detail)
        setErrorMessage(null)
        setErrorRecoveryHint(null)
      } catch (error) {
        if (abortController.signal.aborted) {
          return
        }

        if (error instanceof SupportAuthError) {
          if (
            error.code === 'INTERNAL_AUTH_REQUIRED' ||
            error.code === 'INTERNAL_AUTH_FORBIDDEN' ||
            error.code === 'INTERNAL_AUTH_INVALID'
          ) {
            handleSessionExpired(error)
            return
          }

          setErrorMessage(error.message)
          setErrorRecoveryHint(error.recoveryHint ?? null)
          setRequestDetail(null)
          return
        }

        setErrorMessage('We could not open that support request right now.')
        setErrorRecoveryHint('Return to search and choose a request again.')
        setRequestDetail(null)
      } finally {
        setIsLoading(false)
      }
    }

    void loadDetail()

    return () => abortController.abort()
  }, [handleSessionExpired, publicId, session.accessToken])

  return (
    <main className="app-shell ops-page">
      <section className="ops-hero panel ops-hero--queue">
        <p className="eyebrow">Handrix Internal</p>
        <div className="hero-heading-row">
          <h1 className="hero-title hero-title--wide">
            Request {publicId}
          </h1>
        </div>
        <p className="lede">
          Confirm you opened the right request. Full customer history and prior
          guidance arrive in the next support story.
        </p>
      </section>

      <section className="panel ops-queue-panel">
        <div className="ops-queue-panel__header">
          <div className="ops-queue-panel__heading">
            <p className="ops-kicker">Protected request</p>
            <h2>
              {requestDetail ? requestDetail.issueLabel : `Request ${publicId}`}
            </h2>
            <p className="helper-copy">
              {requestDetail
                ? `Opened ${requestDetail.publicId} for support follow-through.`
                : 'Loading the protected support request detail.'}
            </p>
          </div>

          <div className="ops-request-detail-panel__actions">
            <button
              className="secondary-button"
              onClick={onBack}
              type="button"
            >
              Back to search
            </button>
            <button
              className="secondary-button"
              onClick={onLogout}
              type="button"
            >
              Sign out
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="ops-session-card" aria-live="polite">
            <p className="ops-kicker">Loading request</p>
            <h3>Opening protected support request detail…</h3>
            <p>
              The request context will appear in place once the latest
              protected snapshot is ready.
            </p>
          </div>
        ) : null}

        {errorMessage ? (
          <div className="ops-alert" role="alert">
            <strong>{errorMessage}</strong>
            {errorRecoveryHint ? <p>{errorRecoveryHint}</p> : null}
          </div>
        ) : null}

        {requestDetail && protectedSession ? (
          <div className="ops-request-detail-layout">
            <article className="ops-detail-card">
              <p className="ops-kicker">Current state</p>
              <h3>{requestDetail.currentState.lifecycleStateLabel}</h3>
              <p className="guided-copy">
                {requestDetail.currentState.lifecycleStateDetail}
              </p>
              <div className="ops-detail-list">
                <p>
                  <strong>Customer-facing status:</strong>{' '}
                  {requestDetail.currentState.publicStatusLabel}
                </p>
                <p>{requestDetail.currentState.publicStatusDetail}</p>
              </div>
            </article>

            <article className="ops-detail-card">
              <p className="ops-kicker">Service location</p>
              <h3>{requestDetail.serviceLocation.addressLine1}</h3>
              <div className="ops-detail-list">
                <p>
                  <strong>City:</strong> {requestDetail.serviceLocation.city}
                </p>
                <p>
                  <strong>ZIP code:</strong>{' '}
                  {requestDetail.serviceLocation.postalCode}
                </p>
                {requestDetail.serviceLocation.unitOrAccessNote ? (
                  <p>
                    <strong>Unit or access note:</strong>{' '}
                    {requestDetail.serviceLocation.unitOrAccessNote}
                  </p>
                ) : null}
              </div>
            </article>

            <article className="ops-detail-card">
              <p className="ops-kicker">Latest update</p>
              <h3>{requestDetail.latestChangeSummary}</h3>
              <div className="ops-detail-list">
                <p>
                  <strong>Last updated:</strong>{' '}
                  <time dateTime={requestDetail.lastUpdatedAt}>
                    {formatTimestamp(requestDetail.lastUpdatedAt)}
                  </time>
                </p>
                <p>
                  <strong>Received:</strong>{' '}
                  <time dateTime={requestDetail.createdAt}>
                    {formatTimestamp(requestDetail.createdAt)}
                  </time>
                </p>
              </div>
            </article>

            <article className="ops-detail-card">
              <p className="ops-kicker">Assignment</p>
              <h3>
                {requestDetail.currentAssignmentOwnerLabel
                  ? requestDetail.currentAssignmentOwnerLabel
                  : 'No fulfillment owner assigned yet'}
              </h3>
              {requestDetail.interventionLabel ? (
                <p>
                  <strong>Intervention:</strong>{' '}
                  {requestDetail.interventionLabel}
                </p>
              ) : null}
            </article>

            <div className="ops-session-card">
              <p className="ops-kicker">Scope of this view</p>
              <p>
                Full request history and prior customer guidance arrive in the
                next support story.
              </p>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  )
}
