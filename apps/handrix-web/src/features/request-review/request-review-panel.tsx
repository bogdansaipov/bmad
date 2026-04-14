import type {
  CreateRequestResponse,
  RequestReviewEditTarget,
  RequestReviewSummary,
} from '@handrix/shared-contracts'

type RequestReviewPanelProps = {
  summary: RequestReviewSummary
  onEdit: (target: RequestReviewEditTarget) => void
  onBack: () => void
  onConfirm: () => void
  confirmationState: 'idle' | 'submitting' | 'error'
  confirmationError?: string
  confirmationRecoveryHint?: string
  confirmedRequest: CreateRequestResponse | null
}

export function RequestReviewPanel({
  summary,
  onEdit,
  onBack,
  onConfirm,
  confirmationState,
  confirmationError,
  confirmationRecoveryHint,
  confirmedRequest,
}: RequestReviewPanelProps) {
  if (confirmedRequest) {
    return (
      <section className="panel review-panel" aria-live="polite">
        <p className="next-step-kicker">Request confirmed</p>
        <h2>{confirmedRequest.confirmationHeadline}</h2>
        <p className="guided-copy">{confirmedRequest.confirmationDetail}</p>

        <div className="review-sections" aria-label="Confirmed request details">
          <article className="review-section-card">
            <div className="response-summary">
              <div className="response-summary__item">
                <span className="response-summary__question">Request ID</span>
                <span className="response-summary__answer">{confirmedRequest.publicId}</span>
              </div>
              <div className="response-summary__item">
                <span className="response-summary__question">Issue</span>
                <span className="response-summary__answer">{confirmedRequest.issueLabel}</span>
              </div>
              <div className="response-summary__item">
                <span className="response-summary__question">Current status</span>
                <span className="response-summary__answer">{confirmedRequest.publicStatus}</span>
              </div>
            </div>
          </article>
        </div>

        <article className="review-next-steps">
          <p className="next-step-kicker">What happens next</p>
          <p className="guided-copy">{confirmedRequest.nextStepDetail}</p>
          <ul className="review-bullets">
            <li>Handrix saved this request without asking you to create an account.</li>
            <li>Keep this request ID handy for the next tracking step.</li>
            <li>Your signed tracking credential is now stored for the app handoff.</li>
          </ul>
        </article>
      </section>
    )
  }

  return (
    <section className="panel review-panel" aria-live="polite">
      <p className="next-step-kicker">Request review</p>
      <h2>{summary.headline}</h2>
      <p className="guided-copy">{summary.intro}</p>

      <div className="review-sections" aria-label="Request details summary">
        {summary.sections.map((section) => (
          <article key={section.title} className="review-section-card">
            <div className="review-section-card__header">
              <div>
                <h3>{section.title}</h3>
              </div>
              <button
                type="button"
                className="secondary-action review-section-card__edit"
                onClick={() => onEdit(section.editTarget)}
              >
                {section.editLabel}
              </button>
            </div>

            <div className="response-summary">
              {section.items.map((item) => (
                <div key={`${section.title}-${item.label}`} className="response-summary__item">
                  <span className="response-summary__question">{item.label}</span>
                  <span className="response-summary__answer">{item.value}</span>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="review-expectations" aria-label="Response and pricing expectations">
        <article className="review-info-card">
          <p className="next-step-kicker">{summary.eta.label}</p>
          <h3>{summary.eta.value}</h3>
          <p>{summary.eta.detail}</p>
        </article>

        <article className="review-info-card">
          <p className="next-step-kicker">{summary.pricing.label}</p>
          <h3>{summary.pricing.value}</h3>
          <p>{summary.pricing.detail}</p>
        </article>
      </div>

      <article className="review-next-steps">
        <p className="next-step-kicker">{summary.nextSteps.title}</p>
        <p className="guided-copy">{summary.nextSteps.detail}</p>
        <ul className="review-bullets">
          {summary.nextSteps.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      </article>

      <div className="containment-reassurance">
        <p>{summary.confirmationHint}</p>
        <p className="helper-copy">Confirmation creates the request without requiring an account.</p>
      </div>

      {confirmationState === 'error' && confirmationError ? (
        <div className="inline-alert" role="alert">
          <p>{confirmationError}</p>
          {confirmationRecoveryHint ? <p>{confirmationRecoveryHint}</p> : null}
        </div>
      ) : null}

      <div className="action-row">
        <button type="button" className="secondary-action" onClick={onBack}>
          Back to containment guidance
        </button>
        <button
          type="button"
          className="primary-action"
          onClick={onConfirm}
          disabled={confirmationState === 'submitting'}
        >
          {confirmationState === 'submitting' ? 'Confirming request...' : summary.confirmationLabel}
        </button>
      </div>
    </section>
  )
}
