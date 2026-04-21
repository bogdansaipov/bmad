import { useEffect, useState } from 'react'
import type {
  InternalOpsSession,
  InternalSession,
  OpsRequestDetailResponse,
} from '@handrix/shared-contracts'
import { loadOpsProtectedSession, OpsAuthError } from './ops-auth-api'
import {
  assignOpsRequest,
  loadOpsRequestDetail,
  OpsRequestDetailError,
  updateOpsRequestStatus,
} from './ops-request-detail-api'

type OpsRequestDetailScreenProps = {
  publicId: string
  session: InternalSession
  onBack: () => void
  onLogout: () => void
  onSessionExpired: () => void
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function renderRecoveryKind(
  kind: NonNullable<OpsRequestDetailResponse['history'][number]['customerSnapshot']['recoveryState']>['kind'],
) {
  switch (kind) {
    case 'clarification':
      return 'Clarification needed'
    case 'delay':
      return 'Delay update'
    case 'unavailable':
      return 'Unavailable update'
  }
}

export function OpsRequestDetailScreen({
  publicId,
  session,
  onBack,
  onLogout,
  onSessionExpired,
}: OpsRequestDetailScreenProps) {
  const [protectedSession, setProtectedSession] = useState<InternalOpsSession | null>(null)
  const [requestDetail, setRequestDetail] = useState<OpsRequestDetailResponse | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [errorRecoveryHint, setErrorRecoveryHint] = useState<string | null>(null)
  const [assignmentMessage, setAssignmentMessage] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [selectedOwnerId, setSelectedOwnerId] = useState('')
  const [assignmentNote, setAssignmentNote] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isAssigning, setIsAssigning] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  useEffect(() => {
    const abortController = new AbortController()

    async function loadProtectedRequestDetail() {
      setIsLoading(true)

      try {
        const sessionResult = await loadOpsProtectedSession(
          session.accessToken,
          abortController.signal,
        )

        setProtectedSession(sessionResult)

        const detailResult = await loadOpsRequestDetail(
          session.accessToken,
          publicId,
          abortController.signal,
        )

        setRequestDetail(detailResult)
        setSelectedOwnerId(detailResult.assignment.availableOwners[0]?.ownerId ?? '')
        setAssignmentNote('')
        setErrorMessage(null)
        setErrorRecoveryHint(null)
        setAssignmentMessage(null)
        setStatusMessage(null)
      } catch (error) {
        if (abortController.signal.aborted) {
          return
        }

        if (error instanceof OpsAuthError) {
          setErrorMessage(error.message)
          setErrorRecoveryHint(error.recoveryHint ?? null)
          onSessionExpired()
          return
        }

        if (error instanceof OpsRequestDetailError) {
          setErrorMessage(error.message)
          setErrorRecoveryHint(error.recoveryHint ?? null)
          setRequestDetail(null)
          return
        }

        setErrorMessage('We could not open that operations request right now.')
        setErrorRecoveryHint('Return to the queue and try again.')
        setRequestDetail(null)
      } finally {
        setIsLoading(false)
      }
    }

    void loadProtectedRequestDetail()

    return () => abortController.abort()
  }, [onSessionExpired, publicId, session.accessToken])

  async function handleAssignOwner() {
    if (!requestDetail || !selectedOwnerId) {
      return
    }

    setIsAssigning(true)
    setAssignmentMessage(null)
    setStatusMessage(null)

    try {
      const updatedDetail = await assignOpsRequest(
        session.accessToken,
        publicId,
        {
          ownerId: selectedOwnerId,
          ...(assignmentNote.trim() ? { note: assignmentNote.trim() } : {}),
        },
        new AbortController().signal,
      )

      setRequestDetail(updatedDetail)
      setSelectedOwnerId(updatedDetail.assignment.availableOwners[0]?.ownerId ?? '')
      setAssignmentNote('')
      setErrorMessage(null)
      setErrorRecoveryHint(null)
      setAssignmentMessage('Assignment recorded and dispatch is now in progress.')
    } catch (error) {
      if (error instanceof OpsAuthError) {
        setErrorMessage(error.message)
        setErrorRecoveryHint(error.recoveryHint ?? null)
        onSessionExpired()
        return
      }

      if (error instanceof OpsRequestDetailError) {
        setErrorMessage(error.message)
        setErrorRecoveryHint(error.recoveryHint ?? null)
        return
      }

      setErrorMessage('We could not assign that fulfillment owner right now.')
      setErrorRecoveryHint('Choose an available owner and try again.')
    } finally {
      setIsAssigning(false)
    }
  }

  async function handleUpdateStatus(nextLifecycleState: OpsRequestDetailResponse['availableTransitions'][number]['nextLifecycleState']) {
    if (!requestDetail) {
      return
    }

    setIsUpdatingStatus(true)
    setAssignmentMessage(null)
    setStatusMessage(null)

    try {
      const updatedDetail = await updateOpsRequestStatus(
        session.accessToken,
        publicId,
        { nextLifecycleState },
        new AbortController().signal,
      )

      setRequestDetail(updatedDetail)
      setSelectedOwnerId(updatedDetail.assignment.availableOwners[0]?.ownerId ?? '')
      setAssignmentNote('')
      setErrorMessage(null)
      setErrorRecoveryHint(null)
      setStatusMessage('Lifecycle update recorded and the request detail is now aligned.')
    } catch (error) {
      if (error instanceof OpsAuthError) {
        setErrorMessage(error.message)
        setErrorRecoveryHint(error.recoveryHint ?? null)
        onSessionExpired()
        return
      }

      if (error instanceof OpsRequestDetailError) {
        setErrorMessage(error.message)
        setErrorRecoveryHint(error.recoveryHint ?? null)
        return
      }

      setErrorMessage('We could not apply that lifecycle update right now.')
      setErrorRecoveryHint('Choose one of the available next statuses and try again.')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const currentAssignment = requestDetail?.assignment.currentAssignment ?? null
  const canAssign = requestDetail?.assignment.canAssign ?? false

  return (
    <main className="app-shell ops-page">
      <section className="ops-hero panel ops-hero--queue">
        <p className="eyebrow">Handrix Internal</p>
        <div className="hero-heading-row">
          <h1 className="hero-title hero-title--wide">Operations request detail</h1>
        </div>
        <p className="lede">
          Review the full intake record, customer-visible context, and request history before the
          next dispatch decision.
        </p>
      </section>

      <section className="panel ops-queue-panel ops-request-detail-panel">
        <div className="ops-queue-panel__header">
          <div className="ops-queue-panel__heading">
            <p className="ops-kicker">Protected request</p>
            <h2>{requestDetail ? requestDetail.issueLabel : `Request ${publicId}`}</h2>
            <p className="helper-copy">
              {requestDetail
                ? `Reviewing ${requestDetail.publicId} for operations follow-through.`
                : 'Loading the protected request detail now.'}
            </p>
          </div>

          <div className="ops-request-detail-panel__actions">
            <button className="secondary-button" onClick={onBack} type="button">
              Back to queue
            </button>
            <button className="secondary-button" onClick={onLogout} type="button">
              Sign out
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="ops-session-card" aria-live="polite">
            <p className="ops-kicker">Loading request</p>
            <h3>Opening protected request detail…</h3>
            <p>The request context will appear in place once the latest protected snapshot is ready.</p>
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
            <div className="ops-request-detail-grid">
              <article className="ops-detail-card">
                <p className="ops-kicker">Request snapshot</p>
                <h3>{requestDetail.currentState.lifecycleStateLabel}</h3>
                <p className="guided-copy">{requestDetail.currentState.lifecycleStateDetail}</p>
                <div className="ops-detail-list">
                  <p>
                    <strong>Request ID:</strong> {requestDetail.publicId}
                  </p>
                  <p>
                    <strong>Issue type:</strong> {requestDetail.issueLabel}
                  </p>
                  <p>
                    <strong>Created:</strong>{' '}
                    <time dateTime={requestDetail.createdAt}>
                      {formatTimestamp(requestDetail.createdAt)}
                    </time>
                  </p>
                  <p>
                    <strong>Customer status:</strong> {requestDetail.currentState.publicStatusLabel}
                  </p>
                </div>
              </article>

              <article className="ops-detail-card">
                <p className="ops-kicker">Serviceability and readiness</p>
                <h3>{requestDetail.serviceability.serviceabilityLabel}</h3>
                <p className="guided-copy">{requestDetail.serviceability.classificationDetail}</p>
                <div className="ops-detail-list">
                  <p>
                    <strong>Classification:</strong>{' '}
                    {requestDetail.serviceability.classificationHeadline}
                  </p>
                  <p>
                    <strong>Scope decision:</strong>{' '}
                    {requestDetail.serviceability.scopeDecisionLabel}
                  </p>
                  <p>{requestDetail.serviceability.scopeDecisionDetail}</p>
                  <p>
                    <strong>Coverage:</strong>{' '}
                    {requestDetail.serviceability.coverageDecisionLabel}
                  </p>
                  <p>{requestDetail.serviceability.coverageDecisionDetail}</p>
                  <p>
                    <strong>Dispatch readiness:</strong>{' '}
                    {requestDetail.serviceability.dispatchReadinessLabel}
                  </p>
                  <p>{requestDetail.serviceability.dispatchReadinessDetail}</p>
                </div>
              </article>
            </div>

            <article className="ops-detail-card ops-detail-card--assignment">
              <p className="ops-kicker">Assignment workspace</p>
              <h3>
                {currentAssignment ? currentAssignment.ownerLabel : 'Choose the next fulfillment owner'}
              </h3>
              <p className="guided-copy">
                {currentAssignment
                  ? `${currentAssignment.ownerTypeLabel} assignment recorded ${formatTimestamp(currentAssignment.assignedAt)}.`
                  : 'Use the protected detail view to move a reviewed request into dispatch.'}
              </p>

              <div className="ops-detail-list">
                <p>
                  <strong>Current assignment:</strong>{' '}
                  {currentAssignment
                    ? `${currentAssignment.ownerTypeLabel} • ${currentAssignment.ownerLabel}`
                    : 'No owner assigned yet'}
                </p>
                {currentAssignment?.note ? (
                  <p>
                    <strong>Assignment note:</strong> {currentAssignment.note}
                  </p>
                ) : null}
                {!canAssign && requestDetail.assignment.assignmentBlockedReason ? (
                  <p>{requestDetail.assignment.assignmentBlockedReason}</p>
                ) : null}
              </div>

              <div className="ops-assignment-form">
                <label className="ops-assignment-form__field">
                  <span>Fulfillment owner</span>
                  <select
                    aria-label="Fulfillment owner"
                    value={selectedOwnerId}
                    onChange={(event) => setSelectedOwnerId(event.target.value)}
                    disabled={!canAssign || isAssigning}
                  >
                    {requestDetail.assignment.availableOwners.map((owner) => (
                      <option key={owner.ownerId} value={owner.ownerId}>
                        {owner.ownerTypeLabel}: {owner.ownerLabel}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="ops-assignment-form__field">
                  <span>Assignment note</span>
                  <textarea
                    aria-label="Assignment note"
                    value={assignmentNote}
                    onChange={(event) => setAssignmentNote(event.target.value)}
                    rows={3}
                    disabled={!canAssign || isAssigning}
                  />
                </label>

                {assignmentMessage ? (
                  <p className="ops-assignment-success">{assignmentMessage}</p>
                ) : null}

                <button
                  type="button"
                  className="primary-button"
                  onClick={() => void handleAssignOwner()}
                  disabled={!canAssign || !selectedOwnerId || isAssigning}
                >
                  {isAssigning ? 'Assigning…' : 'Assign fulfillment owner'}
                </button>
              </div>
            </article>

            {requestDetail.intervention ? (
              <article className="ops-detail-card">
                <p className="ops-kicker">Intervention context</p>
                <h3>{requestDetail.intervention.label}</h3>
                <p className="guided-copy">{requestDetail.intervention.detail}</p>
                <div className="ops-detail-list">
                  <p>
                    <strong>Recommended next step:</strong>{' '}
                    {requestDetail.intervention.recommendedAction}
                  </p>
                  <p>
                    <strong>Customer impact:</strong> {requestDetail.intervention.customerImpact}
                  </p>
                  {requestDetail.intervention.latestRelevantChange ? (
                    <p>
                      <strong>Latest intervention update:</strong>{' '}
                      <time dateTime={requestDetail.intervention.latestRelevantChange.occurredAt}>
                        {formatTimestamp(requestDetail.intervention.latestRelevantChange.occurredAt)}
                      </time>{' '}
                      • {requestDetail.intervention.latestRelevantChange.changeSummary}
                    </p>
                  ) : null}
                </div>
              </article>
            ) : null}

            <article className="ops-detail-card ops-detail-card--status">
              <p className="ops-kicker">Lifecycle actions</p>
              <h3>Allowed next updates</h3>
              <p className="guided-copy">
                Use only the approved next steps below so operational changes stay aligned with the
                customer-facing timeline.
              </p>

              {requestDetail.availableTransitions.length > 0 ? (
                <div className="ops-status-actions">
                  {requestDetail.availableTransitions.map((transition) => (
                    <button
                      key={`${transition.nextLifecycleState}-${transition.publicStatus}`}
                      type="button"
                      className="secondary-button ops-status-action"
                      onClick={() => void handleUpdateStatus(transition.nextLifecycleState)}
                      disabled={isUpdatingStatus || isAssigning}
                    >
                      <strong>{transition.actionLabel}</strong>
                      <span>{transition.actionDetail}</span>
                      <span>
                        Next customer status: {transition.publicStatusLabel}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="helper-copy">
                  No additional lifecycle updates are available from the current request state.
                </p>
              )}

              {statusMessage ? <p className="ops-assignment-success">{statusMessage}</p> : null}
            </article>

            <article className="ops-detail-card">
              <p className="ops-kicker">Service location</p>
              <h3>{requestDetail.serviceLocation.addressLine1}</h3>
              <div className="ops-detail-list">
                <p>
                  <strong>City:</strong> {requestDetail.serviceLocation.city}
                </p>
                <p>
                  <strong>ZIP code:</strong> {requestDetail.serviceLocation.postalCode}
                </p>
                {requestDetail.serviceLocation.unitOrAccessNote ? (
                  <p>
                    <strong>Unit or access note:</strong>{' '}
                    {requestDetail.serviceLocation.unitOrAccessNote}
                  </p>
                ) : null}
                {requestDetail.serviceLocation.locationDetails ? (
                  <p>
                    <strong>Location details:</strong>{' '}
                    {requestDetail.serviceLocation.locationDetails}
                  </p>
                ) : null}
              </div>
            </article>

            <article className="ops-detail-card">
              <p className="ops-kicker">Intake answers</p>
              <h3>Submitted intake context</h3>
              <div className="ops-detail-answer-list">
                {requestDetail.intakeAnswers.map((answer) => (
                  <div key={answer.questionId} className="ops-detail-answer">
                    <dt>{answer.questionLabel}</dt>
                    <dd>{answer.answerLabel}</dd>
                  </div>
                ))}
              </div>
            </article>

            <article className="ops-detail-card">
              <p className="ops-kicker">Customer-visible context</p>
              <h3>What the customer has already seen</h3>
              <div className="ops-detail-context-grid">
                <section className="ops-detail-context-block">
                  <h4>Current public status</h4>
                  <p className="guided-copy">{requestDetail.currentState.publicStatusDetail}</p>
                </section>

                <section className="ops-detail-context-block">
                  <h4>Containment guidance</h4>
                  {requestDetail.customerContext.containmentGuidance ? (
                    <>
                      <p className="guided-copy">
                        {requestDetail.customerContext.containmentGuidance.headline}
                      </p>
                      <ul className="review-bullets">
                        {requestDetail.customerContext.containmentGuidance.steps.map((step) => (
                          <li key={step.title}>
                            <strong>{step.title}:</strong> {step.detail}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p className="helper-copy">
                      No containment guidance snapshot was stored for this request.
                    </p>
                  )}
                </section>

                <section className="ops-detail-context-block">
                  <h4>Expectation summary</h4>
                  {requestDetail.customerContext.requestReviewSummary ? (
                    <>
                      <p className="guided-copy">
                        {requestDetail.customerContext.requestReviewSummary.intro}
                      </p>
                      <div className="ops-detail-list">
                        <p>
                          <strong>
                            {requestDetail.customerContext.requestReviewSummary.eta.label}:
                          </strong>{' '}
                          {requestDetail.customerContext.requestReviewSummary.eta.value}
                        </p>
                        <p>
                          <strong>
                            {requestDetail.customerContext.requestReviewSummary.pricing.label}:
                          </strong>{' '}
                          {requestDetail.customerContext.requestReviewSummary.pricing.value}
                        </p>
                        <p>
                          <strong>
                            {requestDetail.customerContext.requestReviewSummary.nextSteps.title}:
                          </strong>{' '}
                          {requestDetail.customerContext.requestReviewSummary.nextSteps.detail}
                        </p>
                      </div>
                    </>
                  ) : (
                    <p className="helper-copy">
                      No review-summary snapshot was stored for this request.
                    </p>
                  )}
                </section>
              </div>
            </article>

            <article className="ops-detail-card">
              <p className="ops-kicker">Request history</p>
              <h3>Append-only lifecycle context</h3>
              <ol className="ops-detail-history">
                {requestDetail.history
                  .slice()
                  .reverse()
                  .map((entry) => (
                    <li key={`${entry.occurredAt}-${entry.changeSummary}`} className="ops-detail-history__item">
                      <div className="ops-detail-history__header">
                        <div>
                          <p className="ops-kicker">{entry.customerSnapshot.publicStatusLabel}</p>
                          <h4>{entry.changeSummary}</h4>
                        </div>
                        <p className="helper-copy">
                          <time dateTime={entry.occurredAt}>{formatTimestamp(entry.occurredAt)}</time>
                        </p>
                      </div>

                      <div className="ops-detail-list">
                        <p>
                          <strong>Actor:</strong> {entry.actorType}
                          {entry.actorId ? ` (${entry.actorId})` : ''}
                        </p>
                        <p>
                          <strong>Lifecycle transition:</strong>{' '}
                          {entry.previousLifecycleState ?? 'none'} to {entry.nextLifecycleState}
                        </p>
                        <p>
                          <strong>Public status transition:</strong>{' '}
                          {entry.previousPublicStatus ?? 'none'} to {entry.nextPublicStatus}
                        </p>
                        {entry.intervention ? (
                          <p>
                            <strong>{entry.intervention.label}:</strong> {entry.intervention.detail}
                          </p>
                        ) : null}
                        <p>{entry.customerSnapshot.publicStatusDetail}</p>
                        <p>{entry.customerSnapshot.nextStepDetail}</p>
                        {entry.customerSnapshot.recoveryState ? (
                          <p>
                            <strong>Recovery update:</strong>{' '}
                            {renderRecoveryKind(entry.customerSnapshot.recoveryState.kind)}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ))}
              </ol>
            </article>

            <div className="ops-session-card">
              <p>
                <strong>Signed in as:</strong> {protectedSession.user.displayName} (
                {protectedSession.user.role})
              </p>
              <p>
                <strong>Email:</strong> {protectedSession.user.email}
              </p>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  )
}
