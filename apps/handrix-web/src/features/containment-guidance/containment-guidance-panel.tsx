import type { ContainmentGuidance } from '@handrix/shared-contracts'

type ContainmentGuidancePanelProps = {
  guidance: ContainmentGuidance
  onBack: () => void
  onContinue: () => void
}

export function ContainmentGuidancePanel({
  guidance,
  onBack,
  onContinue,
}: ContainmentGuidancePanelProps) {
  return (
    <section
      className={`panel containment-panel containment-panel--${guidance.variant}`}
      aria-live="polite"
    >
      <p className="next-step-kicker">
        {guidance.variant === 'informational'
          ? 'Immediate containment guidance'
          : guidance.variant === 'warning'
            ? 'Containment plus service-area warning'
            : 'Recovery-ready containment guidance'}
      </p>
      <h2>{guidance.headline}</h2>
      <p className="guided-copy">{guidance.intro}</p>

      <div className="containment-steps" aria-label="Containment guidance steps">
        {guidance.steps.map((step, index) => (
          <article key={`${step.title}-${index}`} className="containment-step">
            <span className="containment-step__index">{index + 1}</span>
            <div className="containment-step__content">
              <h3>{step.title}</h3>
              <p>{step.detail}</p>
            </div>
          </article>
        ))}
      </div>

      {guidance.warnings.length ? (
        <div className="containment-warnings" aria-label="Containment warnings">
          {guidance.warnings.map((warning, index) => (
            <article key={`${warning.title}-${index}`} className="containment-warning">
              <h3>{warning.title}</h3>
              <p>{warning.detail}</p>
            </article>
          ))}
        </div>
      ) : null}

      <div className="containment-reassurance">
        <p>{guidance.reassurance}</p>
        <p className="helper-copy">{guidance.nextActionHint}</p>
      </div>

      <div className="action-row">
        <button type="button" className="secondary-action" onClick={onBack}>
          Back to address details
        </button>
        <button type="button" className="primary-action" onClick={onContinue}>
          {guidance.nextActionLabel}
        </button>
      </div>
    </section>
  )
}
