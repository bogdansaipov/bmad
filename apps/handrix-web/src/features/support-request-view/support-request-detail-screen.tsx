import { useCallback, useEffect, useState, type FormEvent } from 'react'
import type {
  InternalSession,
  InternalSupportSession,
  SupportInterventionKind,
  SupportRequestDetailHistoryEntry,
  SupportRequestDetailResponse,
} from '@handrix/shared-contracts'
import { loadSupportProtectedSession, SupportAuthError } from './support-auth-api'
import { recordSupportIntervention } from './support-intervention-api'
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

function formatActorLabel(actorType: SupportRequestDetailHistoryEntry['actorType']) {
  switch (actorType) {
    case 'customer':
      return 'Customer'
    case 'ops':
      return 'Operations'
    case 'support':
      return 'Support'
    case 'system':
      return 'System'
  }
}

function formatTransition(previous: string | null, next: string) {
  return `${previous ?? 'None recorded'} to ${next}`
}

const interventionOptions: Array<{
  value: SupportInterventionKind
  label: string
  detail: string
}> = [
  {
    value: 'clarification',
    label: 'Clarification needed',
    detail: 'Use this when one missing customer or access detail is blocking progress.',
  },
  {
    value: 'blocker',
    label: 'Operational blocker',
    detail: 'Use this when the request is active but a hands-on blocker or delay needs follow-up.',
  },
  {
    value: 'unavailable',
    label: 'Unavailable outcome',
    detail: 'Use this when the original fulfillment path cannot continue and fallback guidance matters.',
  },
]

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
  const [interventionKind, setInterventionKind] = useState<SupportInterventionKind>('clarification')
  const [interventionNote, setInterventionNote] = useState('')
  const [shouldUpdateLifecycle, setShouldUpdateLifecycle] = useState(false)
  const [isSubmittingIntervention, setIsSubmittingIntervention] = useState(false)
  const [interventionErrorMessage, setInterventionErrorMessage] = useState<string | null>(null)
  const [interventionRecoveryHint, setInterventionRecoveryHint] = useState<string | null>(null)
  const [interventionSuccessMessage, setInterventionSuccessMessage] = useState<string | null>(null)

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
      setProtectedSession(null)
      setRequestDetail(null)
      setErrorMessage(null)
      setErrorRecoveryHint(null)
      setInterventionKind('clarification')
      setInterventionNote('')
      setShouldUpdateLifecycle(false)
      setInterventionErrorMessage(null)
      setInterventionRecoveryHint(null)
      setInterventionSuccessMessage(null)

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
          setProtectedSession(null)
          setRequestDetail(null)
          return
        }

        setErrorMessage('We could not open that support request right now.')
        setErrorRecoveryHint('Return to search and choose a request again.')
        setProtectedSession(null)
        setRequestDetail(null)
      } finally {
        setIsLoading(false)
      }
    }

    void loadDetail()

    return () => abortController.abort()
  }, [handleSessionExpired, publicId, session.accessToken])

  async function handleInterventionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setInterventionErrorMessage(null)
    setInterventionRecoveryHint(null)
    setInterventionSuccessMessage(null)
    setIsSubmittingIntervention(true)

    try {
      const detail = await recordSupportIntervention(session.accessToken, publicId, {
        kind: interventionKind,
        note: interventionNote,
        updateLifecycle: shouldUpdateLifecycle,
      })

      setRequestDetail(detail)
      setInterventionNote('')
      setShouldUpdateLifecycle(false)
      setInterventionSuccessMessage('Support follow-up recorded.')
    } catch (error) {
      if (error instanceof SupportAuthError) {
        if (
          error.code === 'INTERNAL_AUTH_REQUIRED' ||
          error.code === 'INTERNAL_AUTH_FORBIDDEN' ||
          error.code === 'INTERNAL_AUTH_INVALID'
        ) {
          handleSessionExpired(error)
          return
        }

        setInterventionErrorMessage(error.message)
        setInterventionRecoveryHint(error.recoveryHint ?? null)
        return
      }

      setInterventionErrorMessage('We could not record that support follow-up right now.')
      setInterventionRecoveryHint(
        'Try again in a moment from the protected support request view.',
      )
    } finally {
      setIsSubmittingIntervention(false)
    }
  }

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
          Review the full request context before you reply so support follow-up
          stays aligned with what the customer has already seen.
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
              The full support context will appear in place once the latest
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
            <div className="ops-request-detail-grid">
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
                <p className="ops-kicker">Fulfillment context</p>
                <h3>
                  {requestDetail.assignment
                    ? requestDetail.assignment.ownerLabel
                    : 'No fulfillment owner assigned yet'}
                </h3>
                <div className="ops-detail-list">
                  {requestDetail.assignment ? (
                    <>
                      <p>
                        <strong>Owner type:</strong>{' '}
                        {requestDetail.assignment.ownerTypeLabel}
                      </p>
                      <p>
                        <strong>Assigned at:</strong>{' '}
                        <time dateTime={requestDetail.assignment.assignedAt}>
                          {formatTimestamp(requestDetail.assignment.assignedAt)}
                        </time>
                      </p>
                      {requestDetail.assignment.note ? (
                        <p>
                          <strong>Assignment note:</strong>{' '}
                          {requestDetail.assignment.note}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <p>No fulfillment owner has been assigned yet.</p>
                  )}
                  {requestDetail.intervention ? (
                    <>
                      <p>
                        <strong>Intervention:</strong>{' '}
                        {requestDetail.intervention.label}
                      </p>
                      <p>{requestDetail.intervention.detail}</p>
                      <p>
                        <strong>Customer impact:</strong>{' '}
                        {requestDetail.intervention.customerImpact}
                      </p>
                    </>
                  ) : null}
                </div>
              </article>
            </div>

            {requestDetail.explanation ? (
              <section className="ops-detail-card">
                <p className="ops-kicker">Explanation and recovery</p>
                <h3>{requestDetail.explanation.label}</h3>
                <p className="guided-copy">{requestDetail.explanation.detail}</p>
                <div className="ops-detail-context-grid">
                  <div className="ops-detail-context-block">
                    <h4>What changed</h4>
                    <p>{requestDetail.explanation.reasonDetail}</p>
                    {requestDetail.explanation.latestRelevantChange ? (
                      <p className="helper-copy">
                        Latest relevant change from{' '}
                        {formatActorLabel(
                          requestDetail.explanation.latestRelevantChange.actorType,
                        )}
                        {' '}at{' '}
                        {formatTimestamp(
                          requestDetail.explanation.latestRelevantChange.occurredAt,
                        )}
                        .
                      </p>
                    ) : null}
                  </div>

                  <div className="ops-detail-context-block">
                    <h4>What the customer has already been told</h4>
                    <p>
                      <strong>{requestDetail.currentState.publicStatusLabel}:</strong>{' '}
                      {requestDetail.currentState.publicStatusDetail}
                    </p>
                    {requestDetail.explanation.customerVisibleRecovery ? (
                      <>
                        <p>
                          <strong>
                            {requestDetail.explanation.customerVisibleRecovery.title}
                          </strong>
                        </p>
                        <p>{requestDetail.explanation.customerVisibleRecovery.detail}</p>
                        <p>
                          <strong>Expectation update:</strong>{' '}
                          {requestDetail.explanation.expectationUpdate}
                        </p>
                      </>
                    ) : null}
                  </div>

                  <div className="ops-detail-context-block">
                    <h4>{requestDetail.explanation.nextActionLabel}</h4>
                    <p>{requestDetail.explanation.nextActionDetail}</p>
                    {requestDetail.explanation.fallbackGuidance ? (
                      <p>
                        <strong>Fallback guidance:</strong>{' '}
                        {requestDetail.explanation.fallbackGuidance}
                      </p>
                    ) : null}
                  </div>
                </div>
              </section>
            ) : null}

            <section className="ops-detail-card">
              <p className="ops-kicker">Manual follow-up</p>
              <h3>Record support intervention</h3>
              <p className="guided-copy">
                Save internal follow-up clearly, and only update the request handling
                state when the intervention should change the approved lifecycle.
              </p>

              {requestDetail.latestSupportFollowUp ? (
                <div className="ops-detail-list">
                  <p>
                    <strong>Latest support follow-up:</strong>{' '}
                    {requestDetail.latestSupportFollowUp.label}
                  </p>
                  <p>{requestDetail.latestSupportFollowUp.detail}</p>
                  <p>
                    <strong>Visibility:</strong>{' '}
                    {requestDetail.latestSupportFollowUp.visibilityLabel}
                  </p>
                  <p>
                    <strong>Affects lifecycle:</strong>{' '}
                    {requestDetail.latestSupportFollowUp.affectsLifecycle ? 'Yes' : 'No'}
                  </p>
                  <p>
                    <strong>Recorded:</strong>{' '}
                    <time dateTime={requestDetail.latestSupportFollowUp.recordedAt}>
                      {formatTimestamp(requestDetail.latestSupportFollowUp.recordedAt)}
                    </time>
                  </p>
                </div>
              ) : (
                <p>No support follow-up has been recorded for this request yet.</p>
              )}

              <form className="ops-detail-list" onSubmit={handleInterventionSubmit}>
                <label className="ops-field" htmlFor="support-intervention-kind">
                  <span>Follow-up type</span>
                  <select
                    id="support-intervention-kind"
                    className="ops-input"
                    value={interventionKind}
                    onChange={(event) =>
                      setInterventionKind(event.target.value as SupportInterventionKind)
                    }
                    disabled={isSubmittingIntervention}
                  >
                    {interventionOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <p className="helper-copy">
                  {interventionOptions.find((option) => option.value === interventionKind)?.detail}
                </p>

                <label className="ops-field" htmlFor="support-intervention-note">
                  <span>Internal follow-up note</span>
                  <textarea
                    id="support-intervention-note"
                    className="ops-input"
                    value={interventionNote}
                    onChange={(event) => setInterventionNote(event.target.value)}
                    disabled={isSubmittingIntervention}
                    rows={4}
                    maxLength={280}
                  />
                </label>

                <label className="ops-field" htmlFor="support-intervention-lifecycle">
                  <span>
                    <input
                      id="support-intervention-lifecycle"
                      type="checkbox"
                      checked={shouldUpdateLifecycle}
                      onChange={(event) => setShouldUpdateLifecycle(event.target.checked)}
                      disabled={isSubmittingIntervention}
                    />{' '}
                    Update the request handling state to match this follow-up
                  </span>
                </label>

                <p className="helper-copy">
                  Leave this unchecked to save an internal-only follow-up without
                  changing the customer-facing request timeline.
                </p>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={isSubmittingIntervention}
                >
                  {isSubmittingIntervention ? 'Saving follow-up...' : 'Save follow-up'}
                </button>
              </form>

              {interventionSuccessMessage ? (
                <div className="ops-session-card" aria-live="polite">
                  <p>{interventionSuccessMessage}</p>
                </div>
              ) : null}

              {interventionErrorMessage ? (
                <div className="ops-alert" role="alert">
                  <strong>{interventionErrorMessage}</strong>
                  {interventionRecoveryHint ? <p>{interventionRecoveryHint}</p> : null}
                </div>
              ) : null}
            </section>

            <article className="ops-detail-card">
              <p className="ops-kicker">Classification and intake</p>
              <h3>{requestDetail.classification.summaryHeadline}</h3>
              <p className="guided-copy">
                {requestDetail.classification.summaryDetail}
              </p>
              <dl className="ops-detail-answer-list">
                {requestDetail.intakeAnswers.map((answer) => (
                  <div className="ops-detail-answer" key={answer.questionLabel}>
                    <dt>{answer.questionLabel}</dt>
                    <dd>{answer.answerLabel}</dd>
                  </div>
                ))}
              </dl>
            </article>

            <section className="ops-detail-card">
              <p className="ops-kicker">Customer-visible context</p>
              <div className="ops-detail-context-grid">
                <div className="ops-detail-context-block">
                  <h3>Containment guidance shown</h3>
                  {requestDetail.customerContext.containmentGuidance ? (
                    <>
                      <p>
                        <strong>
                          {requestDetail.customerContext.containmentGuidance.headline}
                        </strong>
                      </p>
                      <p>{requestDetail.customerContext.containmentGuidance.intro}</p>
                      {requestDetail.customerContext.containmentGuidance.steps.map(
                        (step) => (
                          <p key={step.title}>
                            <strong>{step.title}:</strong> {step.detail}
                          </p>
                        ),
                      )}
                      {requestDetail.customerContext.containmentGuidance.warnings.map(
                        (warning) => (
                          <p key={warning.title}>
                            <strong>{warning.title}:</strong> {warning.detail}
                          </p>
                        ),
                      )}
                      <p>
                        <strong>Reassurance shown:</strong>{' '}
                        {requestDetail.customerContext.containmentGuidance.reassurance}
                      </p>
                      <p>
                        <strong>
                          {requestDetail.customerContext.containmentGuidance.nextActionLabel}:
                        </strong>{' '}
                        {requestDetail.customerContext.containmentGuidance.nextActionHint}
                      </p>
                    </>
                  ) : (
                    <p>No containment guidance snapshot was stored for this request.</p>
                  )}
                </div>

                <div className="ops-detail-context-block">
                  <h3>Expectation setting shown</h3>
                  {requestDetail.customerContext.requestReviewSummary ? (
                    <>
                      <p>
                        <strong>
                          {requestDetail.customerContext.requestReviewSummary.headline}
                        </strong>
                      </p>
                      <p>{requestDetail.customerContext.requestReviewSummary.intro}</p>
                      <p>
                        <strong>
                          {requestDetail.customerContext.requestReviewSummary.eta.label}:
                        </strong>{' '}
                        {requestDetail.customerContext.requestReviewSummary.eta.value}
                      </p>
                      <p>{requestDetail.customerContext.requestReviewSummary.eta.detail}</p>
                      <p>
                        <strong>
                          {requestDetail.customerContext.requestReviewSummary.pricing.label}:
                        </strong>{' '}
                        {requestDetail.customerContext.requestReviewSummary.pricing.value}
                      </p>
                      <p>
                        {requestDetail.customerContext.requestReviewSummary.pricing.detail}
                      </p>
                      {requestDetail.customerContext.requestReviewSummary.sections.map(
                        (section) => (
                          <div key={section.title} className="ops-detail-list">
                            <p>
                              <strong>{section.title}</strong>
                            </p>
                            {section.items.map((item) => (
                              <p key={`${section.title}-${item.label}`}>
                                <strong>{item.label}:</strong> {item.value}
                              </p>
                            ))}
                          </div>
                        ),
                      )}
                      <p>
                        <strong>
                          {requestDetail.customerContext.requestReviewSummary.nextSteps.title}:
                        </strong>{' '}
                        {
                          requestDetail.customerContext.requestReviewSummary.nextSteps.detail
                        }
                      </p>
                      {requestDetail.customerContext.requestReviewSummary.nextSteps.bullets.map(
                        (bullet) => (
                          <p key={bullet}>{bullet}</p>
                        ),
                      )}
                      <p>
                        <strong>
                          {requestDetail.customerContext.requestReviewSummary.confirmationLabel}
                        </strong>
                      </p>
                      <p>
                        {requestDetail.customerContext.requestReviewSummary.confirmationHint}
                      </p>
                    </>
                  ) : (
                    <p>No review-summary snapshot was stored for this request.</p>
                  )}
                </div>
              </div>
            </section>

            <section className="ops-detail-card">
              <p className="ops-kicker">Request history</p>
              <ol className="ops-detail-history">
                {requestDetail.history.map((entry, index) => (
                  <li
                    className="ops-detail-history__item"
                    key={`${entry.occurredAt}-${index}`}
                  >
                    <div className="ops-detail-history__header">
                      <strong>{entry.customerSnapshot.publicStatusLabel}</strong>
                      <time dateTime={entry.occurredAt}>
                        {formatTimestamp(entry.occurredAt)}
                      </time>
                    </div>
                    <p>
                      <strong>Actor:</strong> {formatActorLabel(entry.actorType)}
                    </p>
                    <p>
                      <strong>Visibility:</strong> {entry.visibilityLabel}
                    </p>
                    <p>
                      <strong>Lifecycle transition:</strong>{' '}
                      {formatTransition(
                        entry.previousLifecycleStateLabel,
                        entry.nextLifecycleStateLabel,
                      )}
                    </p>
                    <p>
                      <strong>Public status transition:</strong>{' '}
                      {formatTransition(
                        entry.previousPublicStatusLabel,
                        entry.nextPublicStatusLabel,
                      )}
                    </p>
                    <p>{entry.changeSummary}</p>
                    <p>{entry.customerSnapshot.publicStatusDetail}</p>
                    <p>
                      <strong>Next step shown:</strong>{' '}
                      {entry.customerSnapshot.nextStepDetail}
                    </p>
                    {entry.customerSnapshot.recoveryState ? (
                      <>
                        <p>
                          <strong>Recovery update:</strong>{' '}
                          {entry.customerSnapshot.recoveryState.title}
                        </p>
                        <p>{entry.customerSnapshot.recoveryState.detail}</p>
                      </>
                    ) : null}
                    {entry.intervention ? (
                      <p>
                        <strong>Intervention marker:</strong>{' '}
                        {entry.intervention.label}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
            </section>
          </div>
        ) : null}
      </section>
    </main>
  )
}
