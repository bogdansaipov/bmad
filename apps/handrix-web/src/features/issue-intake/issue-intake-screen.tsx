import { useEffect, useMemo, useState } from 'react'
import type {
  ClarifyingAnswer,
  ContainmentGuidance,
  CreateRequestResponse,
  IntakeClassification,
  IntakeQuestionSet,
  IssueType,
  IssueTypeId,
  RequestReviewEditTarget,
  RequestReviewSummary,
  ServiceLocation,
} from '@handrix/shared-contracts'
import { loadContainmentGuidance } from '../containment-guidance/containment-guidance-api'
import { ContainmentGuidancePanel } from '../containment-guidance/containment-guidance-panel'
import {
  RequestConfirmationError,
  submitAnonymousRequest,
} from '../request-review/request-confirmation-api'
import { loadRequestReviewSummary } from '../request-review/request-review-api'
import { RequestReviewPanel } from '../request-review/request-review-panel'
import {
  evaluateIntake,
  loadIntakeQuestionSet,
  loadIssueTypes,
} from './issue-types-api'
import { IssueSelectionCard } from './issue-selection-card'
import type { SavedTrackedRequest } from '../request-tracking/request-tracking-storage'

type IssueIntakeScreenProps = {
  savedTrackedRequest: SavedTrackedRequest | null
  onRememberTrackedRequest: (request: CreateRequestResponse) => void
  onOpenTracking: (request: CreateRequestResponse | SavedTrackedRequest) => void
}

type FlowStep = 'select' | 'questions' | 'location' | 'guidance' | 'review'
type LoadStatus = 'loading' | 'ready' | 'error'
type ValidationErrors = Partial<Record<keyof ServiceLocation, string>>

const emptyLocation: ServiceLocation = {
  addressLine1: '',
  unitOrAccessNote: '',
  city: '',
  postalCode: '',
  locationDetails: '',
}

function formatBooleanChoice(value: boolean) {
  return value ? 'Yes' : 'No'
}

function createIdempotencyKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `request-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`
}

export function IssueIntakeScreen({
  savedTrackedRequest,
  onRememberTrackedRequest,
  onOpenTracking,
}: IssueIntakeScreenProps) {
  const [issueTypes, setIssueTypes] = useState<IssueType[]>([])
  const [selectedIssueId, setSelectedIssueId] = useState<IssueTypeId | null>(null)
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [questionSet, setQuestionSet] = useState<IntakeQuestionSet | null>(null)
  const [questionStatus, setQuestionStatus] = useState<LoadStatus>('loading')
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, boolean | string>>({})
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [serviceLocation, setServiceLocation] = useState<ServiceLocation>(emptyLocation)
  const [locationErrors, setLocationErrors] = useState<ValidationErrors>({})
  const [classification, setClassification] = useState<IntakeClassification | null>(null)
  const [guidance, setGuidance] = useState<ContainmentGuidance | null>(null)
  const [guidanceStatus, setGuidanceStatus] = useState<LoadStatus>('loading')
  const [reviewSummary, setReviewSummary] = useState<RequestReviewSummary | null>(null)
  const [reviewStatus, setReviewStatus] = useState<LoadStatus>('loading')
  const [locationSubmissionStatus, setLocationSubmissionStatus] = useState<
    'idle' | 'submitting' | 'error'
  >('idle')
  const [requestSubmissionStatus, setRequestSubmissionStatus] = useState<
    'idle' | 'submitting' | 'error'
  >('idle')
  const [requestSubmissionError, setRequestSubmissionError] = useState('')
  const [requestSubmissionRecoveryHint, setRequestSubmissionRecoveryHint] = useState('')
  const [requestIdempotencyKey, setRequestIdempotencyKey] = useState('')
  const [confirmedRequest, setConfirmedRequest] = useState<CreateRequestResponse | null>(null)
  const [step, setStep] = useState<FlowStep>('select')

  const isConfirmationVisible = step === 'review' && confirmedRequest !== null

  useEffect(() => {
    const controller = new AbortController()

    async function fetchIssueTypes() {
      try {
        const nextIssueTypes = await loadIssueTypes(controller.signal)
        setIssueTypes(nextIssueTypes)
        setStatus('ready')
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        setStatus('error')
      }
    }

    void fetchIssueTypes()

    return () => {
      controller.abort()
    }
  }, [])

  useEffect(() => {
    if (selectedIssueId === null) {
      return
    }

    const issueTypeId = selectedIssueId
    const controller = new AbortController()

    async function fetchQuestionSet() {
      try {
        const nextQuestionSet = await loadIntakeQuestionSet(issueTypeId, controller.signal)
        setQuestionSet(nextQuestionSet)
        setQuestionStatus('ready')
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        setQuestionStatus('error')
      }
    }

    void fetchQuestionSet()

    return () => {
      controller.abort()
    }
  }, [selectedIssueId])

  const selectedIssue = useMemo(
    () =>
      selectedIssueId === null
        ? null
        : issueTypes.find((issueType) => issueType.id === selectedIssueId) ?? null,
    [issueTypes, selectedIssueId],
  )

  const currentQuestion =
    questionSet?.questions.length ? questionSet.questions[currentQuestionIndex] : null
  const currentAnswer =
    currentQuestion === null ? undefined : questionAnswers[currentQuestion.id]
  const answeredQuestionPairs = questionSet?.questions
    .map((question) => ({
      question,
      value: questionAnswers[question.id],
    }))
    .filter((entry) => entry.value !== undefined)

  function resetFlowState(nextStep: FlowStep = 'select') {
    setQuestionSet(null)
    setQuestionStatus('loading')
    setQuestionAnswers({})
    setCurrentQuestionIndex(0)
    setServiceLocation(emptyLocation)
    setLocationErrors({})
    setClassification(null)
    setGuidance(null)
    setGuidanceStatus('loading')
    setReviewSummary(null)
    setReviewStatus('loading')
    setLocationSubmissionStatus('idle')
    setRequestSubmissionStatus('idle')
    setRequestSubmissionError('')
    setRequestSubmissionRecoveryHint('')
    setRequestIdempotencyKey('')
    setConfirmedRequest(null)
    setStep(nextStep)
  }

  function handleIssueSelect(issueTypeId: IssueTypeId) {
    resetFlowState('questions')
    setSelectedIssueId(issueTypeId)
  }

  function handleBooleanAnswer(questionId: string, value: boolean) {
    setQuestionAnswers((currentAnswers) => ({
      ...currentAnswers,
      [questionId]: value,
    }))
  }

  function goToNextQuestion() {
    if (questionSet === null || currentQuestion === null || currentAnswer === undefined) {
      return
    }

    if (currentQuestionIndex < questionSet.questions.length - 1) {
      setCurrentQuestionIndex((index) => index + 1)
      return
    }

    setStep('location')
  }

  function goToPreviousQuestion() {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((index) => index - 1)
      return
    }

    resetFlowState()
    setSelectedIssueId(null)
  }

  function updateLocationField(field: keyof ServiceLocation, value: string) {
    setServiceLocation((currentLocation) => ({
      ...currentLocation,
      [field]: value,
    }))
    setLocationErrors((currentErrors) => ({
      ...currentErrors,
      [field]: undefined,
    }))
  }

  function buildAnswers(): ClarifyingAnswer[] {
    return (
      questionSet?.questions.map((question) => ({
        questionId: question.id,
        value: questionAnswers[question.id] as boolean | string,
      })) ?? []
    )
  }

  function validateLocation() {
    const nextErrors: ValidationErrors = {}

    if (serviceLocation.addressLine1.trim().length < 3) {
      nextErrors.addressLine1 = 'Enter the street address where help is needed.'
    }

    if (serviceLocation.city.trim().length < 2) {
      nextErrors.city = 'Enter the city for this service address.'
    }

    if (!/^\d{5}$/.test(serviceLocation.postalCode.trim())) {
      nextErrors.postalCode = 'Enter a 5-digit ZIP code so we can check the service area.'
    }

    setLocationErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleLocationSubmit() {
    if (selectedIssueId === null || !validateLocation()) {
      return
    }

    setLocationSubmissionStatus('submitting')

    try {
      const answers = buildAnswers()

      const nextClassification = await evaluateIntake({
        issueTypeId: selectedIssueId,
        answers,
        serviceLocation,
      })
      setGuidanceStatus('loading')
      const nextGuidance = await loadContainmentGuidance(selectedIssueId, {
        serviceabilityStatus: nextClassification.serviceabilityStatus,
        nextStep: nextClassification.nextStep,
        recoveryCode: nextClassification.recoveryCode,
      })

      setClassification(nextClassification)
      setGuidance(nextGuidance)
      setGuidanceStatus('ready')
      setReviewSummary(null)
      setReviewStatus('loading')
      setLocationSubmissionStatus('idle')
      setStep('guidance')
    } catch {
      setLocationSubmissionStatus('error')
      setGuidanceStatus('error')
    }
  }

  async function handleContinueToReview() {
    if (
      selectedIssueId === null ||
      classification === null ||
      questionSet === null ||
      classification.nextStep !== 'continueToContainment'
    ) {
      resetFlowState()
      setSelectedIssueId(null)
      return
    }

    setReviewStatus('loading')
    setRequestSubmissionStatus('idle')
    setRequestSubmissionError('')
    setRequestSubmissionRecoveryHint('')
    setConfirmedRequest(null)
    setStep('review')

    try {
      const nextReviewSummary = await loadRequestReviewSummary({
        issueTypeId: selectedIssueId,
        answers: buildAnswers(),
        serviceLocation,
        classification,
      })

      setReviewSummary(nextReviewSummary)
      setRequestIdempotencyKey((currentValue) =>
        currentValue.length > 0 ? currentValue : createIdempotencyKey(),
      )
      setReviewStatus('ready')
    } catch {
      setReviewSummary(null)
      setReviewStatus('error')
    }
  }

  function handleEditTarget(target: RequestReviewEditTarget) {
    setReviewSummary(null)
    setReviewStatus('loading')
    setRequestSubmissionStatus('idle')
    setRequestSubmissionError('')
    setRequestSubmissionRecoveryHint('')
    setConfirmedRequest(null)
    setStep(target === 'issueDetails' ? 'questions' : 'location')
  }

  async function handleConfirmRequest() {
    if (
      selectedIssueId === null ||
      classification === null ||
      requestSubmissionStatus === 'submitting'
    ) {
      return
    }

    const idempotencyKey =
      requestIdempotencyKey.length > 0 ? requestIdempotencyKey : createIdempotencyKey()

    setRequestIdempotencyKey(idempotencyKey)
    setRequestSubmissionStatus('submitting')
    setRequestSubmissionError('')
    setRequestSubmissionRecoveryHint('')

    try {
      const response = await submitAnonymousRequest({
        issueTypeId: selectedIssueId,
        answers: buildAnswers(),
        serviceLocation,
        classification,
        idempotencyKey,
      })

      setConfirmedRequest(response)
      onRememberTrackedRequest(response)
      setRequestSubmissionStatus('idle')
    } catch (error) {
      setRequestSubmissionStatus('error')

      if (error instanceof RequestConfirmationError) {
        setRequestSubmissionError(error.message)
        setRequestSubmissionRecoveryHint(
          error.recoveryHint ?? 'Please try again using the same reviewed details.',
        )
        return
      }

      setRequestSubmissionError('We could not confirm the request right now.')
      setRequestSubmissionRecoveryHint(
        'Please try again using the same reviewed details.',
      )
    }
  }

  const progressLabel =
    isConfirmationVisible
      ? 'Request received'
      : step === 'select'
      ? 'Step 1 of 3'
      : step === 'questions'
        ? 'Step 2 of 3'
        : step === 'location'
          ? 'Step 3 of 3'
          : step === 'guidance'
            ? 'Containment guidance'
            : 'Review and confirm'

  const heroTitle = isConfirmationVisible
    ? 'Your plumbing request is now moving forward.'
    : 'What plumbing issue do you need help with?'
  const heroLede = isConfirmationVisible
    ? 'Handrix has your request details and service location. You can pause here knowing the next step is already in motion.'
    : "Choose the option that feels closest to what is happening. We'll guide you through the next step without asking for plumbing jargon."
  const heroSupportCopy = isConfirmationVisible
    ? 'Keep the request ID below handy if you want to revisit status later without creating an account.'
    : 'We currently support a focused set of small plumbing problems so we can move quickly and keep the process clear.'

  return (
    <main className="app-shell issue-intake-page">
      <section className={`intake-hero${isConfirmationVisible ? ' intake-hero--confirmation' : ''}`}>
        <p className="eyebrow">Handrix urgent plumbing help</p>
        <div className="hero-heading-row">
          <span className="progress-pill">{progressLabel}</span>
        </div>
        <h1 className={isConfirmationVisible ? 'hero-title hero-title--wide' : 'hero-title'}>
          {heroTitle}
        </h1>
        <p className="lede">{heroLede}</p>
        <p className="support-copy">{heroSupportCopy}</p>
      </section>

      <section className="issue-grid-section" aria-label="Supported issue selection">
        {status === 'loading' ? (
          <div className="panel status-panel" role="status">
            Loading supported issue types...
          </div>
        ) : null}

        {status === 'error' ? (
          <div className="panel status-panel" role="alert">
            We couldn&apos;t load the supported issue list right now. Please refresh and
            try again.
          </div>
        ) : null}

        {status === 'ready' ? (
          <>
            {!isConfirmationVisible ? (
              <div className="issue-grid">
                {issueTypes.map((issueType) => (
                  <IssueSelectionCard
                    key={issueType.id}
                    issueType={issueType}
                    isSelected={selectedIssueId === issueType.id}
                    onSelect={handleIssueSelect}
                  />
                ))}
              </div>
            ) : null}

            {step === 'select' ? (
              <aside className="panel next-step-panel" aria-live="polite">
                {selectedIssue ? (
                  <>
                    <p className="next-step-kicker">Selected issue: {selectedIssue.label}</p>
                    <h2>Next, we&apos;ll ask just a few quick details.</h2>
                    <p>
                      We only ask follow-up questions that help us understand this issue
                      and keep your request moving.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="next-step-kicker">Choose one issue to continue</p>
                    <h2>We&apos;ll keep the next step simple.</h2>
                    <p>
                      After you pick an issue, Handrix will show only the follow-up that
                      matters for that situation.
                    </p>
                    {savedTrackedRequest ? (
                      <div className="tracking-resume-panel">
                        <p className="next-step-kicker">Saved request status</p>
                        <h3>Reopen your latest tracked request.</h3>
                        <p className="helper-copy">
                          This device still has the last saved tracking identity for{' '}
                          {savedTrackedRequest.issueLabel.toLowerCase()}.
                        </p>
                        <button
                          type="button"
                          className="secondary-action"
                          onClick={() => onOpenTracking(savedTrackedRequest)}
                        >
                          Open saved request status
                        </button>
                      </div>
                    ) : null}
                  </>
                )}
              </aside>
            ) : null}

            {step === 'questions' ? (
              <section className="panel guided-panel" aria-live="polite">
                {questionStatus === 'loading' ? (
                  <div role="status">Loading the follow-up questions for this issue...</div>
                ) : null}

                {questionStatus === 'error' ? (
                  <div role="alert">
                    We couldn&apos;t load the next details for this issue right now. Please
                    choose the issue again and try one more time.
                  </div>
                ) : null}

                {questionStatus === 'ready' && selectedIssue && currentQuestion ? (
                  <>
                    <p className="next-step-kicker">
                      {selectedIssue.label} • question {currentQuestionIndex + 1} of{' '}
                      {questionSet?.questions.length}
                    </p>
                    <h2>{questionSet?.title}</h2>
                    <p className="guided-copy">{currentQuestion.prompt}</p>
                    {currentQuestion.helperText ? (
                      <p className="helper-copy">{currentQuestion.helperText}</p>
                    ) : null}

                    <div className="choice-grid">
                      <button
                        type="button"
                        className={`choice-card${currentAnswer === true ? ' choice-card--selected' : ''}`}
                        aria-pressed={currentAnswer === true}
                        onClick={() => handleBooleanAnswer(currentQuestion.id, true)}
                      >
                        <span className="choice-card__label">Yes</span>
                        <span className="choice-card__description">
                          This matches what is happening right now.
                        </span>
                      </button>
                      <button
                        type="button"
                        className={`choice-card${currentAnswer === false ? ' choice-card--selected' : ''}`}
                        aria-pressed={currentAnswer === false}
                        onClick={() => handleBooleanAnswer(currentQuestion.id, false)}
                      >
                        <span className="choice-card__label">No</span>
                        <span className="choice-card__description">
                          This does not match what you are seeing.
                        </span>
                      </button>
                    </div>

                    <div className="action-row">
                      <button
                        type="button"
                        className="secondary-action"
                        onClick={goToPreviousQuestion}
                      >
                        {currentQuestionIndex === 0 ? 'Back to issues' : 'Back'}
                      </button>
                      <button
                        type="button"
                        className="primary-action"
                        onClick={goToNextQuestion}
                        disabled={currentAnswer === undefined}
                      >
                        {currentQuestionIndex === (questionSet?.questions.length ?? 1) - 1
                          ? 'Continue to address'
                          : 'Continue'}
                      </button>
                    </div>
                  </>
                ) : null}
              </section>
            ) : null}

            {step === 'location' ? (
              <section className="panel guided-panel" aria-live="polite">
                <p className="next-step-kicker">Service location</p>
                <h2>Where do you need help?</h2>
                <p className="guided-copy">
                  We only need the service address details that help us confirm scope and
                  coverage for this request.
                </p>

                {answeredQuestionPairs?.length ? (
                  <div className="response-summary" aria-label="Clarifying answers summary">
                    {answeredQuestionPairs.map(({ question, value }) => (
                      <div key={question.id} className="response-summary__item">
                        <span className="response-summary__question">{question.prompt}</span>
                        <span className="response-summary__answer">
                          {typeof value === 'boolean' ? formatBooleanChoice(value) : value}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="field-grid">
                  <label className="field">
                    <span className="field__label">Street address</span>
                    <input
                      value={serviceLocation.addressLine1}
                      onChange={(event) => updateLocationField('addressLine1', event.target.value)}
                      aria-invalid={locationErrors.addressLine1 ? 'true' : 'false'}
                    />
                    {locationErrors.addressLine1 ? (
                      <span className="field__error">{locationErrors.addressLine1}</span>
                    ) : null}
                  </label>

                  <label className="field">
                    <span className="field__label">Unit or access note</span>
                    <input
                      value={serviceLocation.unitOrAccessNote}
                      onChange={(event) =>
                        updateLocationField('unitOrAccessNote', event.target.value)
                      }
                    />
                  </label>

                  <label className="field">
                    <span className="field__label">City</span>
                    <input
                      value={serviceLocation.city}
                      onChange={(event) => updateLocationField('city', event.target.value)}
                      aria-invalid={locationErrors.city ? 'true' : 'false'}
                    />
                    {locationErrors.city ? (
                      <span className="field__error">{locationErrors.city}</span>
                    ) : null}
                  </label>

                  <label className="field">
                    <span className="field__label">ZIP code</span>
                    <input
                      inputMode="numeric"
                      value={serviceLocation.postalCode}
                      onChange={(event) => updateLocationField('postalCode', event.target.value)}
                      aria-invalid={locationErrors.postalCode ? 'true' : 'false'}
                    />
                    {locationErrors.postalCode ? (
                      <span className="field__error">{locationErrors.postalCode}</span>
                    ) : null}
                  </label>

                  <label className="field field--full">
                    <span className="field__label">Location details</span>
                    <textarea
                      rows={4}
                      value={serviceLocation.locationDetails}
                      onChange={(event) =>
                        updateLocationField('locationDetails', event.target.value)
                      }
                    />
                  </label>
                </div>

                {locationSubmissionStatus === 'error' ? (
                  <div className="inline-alert" role="alert">
                    We couldn&apos;t check this request right now. Please review the address and try
                    again.
                  </div>
                ) : null}

                <div className="action-row">
                  <button
                    type="button"
                    className="secondary-action"
                    onClick={() => setStep('questions')}
                  >
                    Back to questions
                  </button>
                  <button
                    type="button"
                    className="primary-action"
                    onClick={() => void handleLocationSubmit()}
                    disabled={locationSubmissionStatus === 'submitting'}
                  >
                    {locationSubmissionStatus === 'submitting'
                      ? 'Checking serviceability...'
                      : 'Check coverage and continue'}
                  </button>
                </div>
              </section>
            ) : null}

            {step === 'guidance' ? (
              <>
                {guidanceStatus === 'loading' ? (
                  <section className="panel status-panel" aria-live="polite">
                    Loading immediate containment guidance...
                  </section>
                ) : null}

                {guidanceStatus === 'error' || !guidance || !classification ? (
                  <section className="panel result-panel result-panel--recovery" aria-live="polite">
                    <p className="next-step-kicker">Guidance unavailable</p>
                    <h2>We couldn&apos;t load the containment guidance right now.</h2>
                    <p className="guided-copy">
                      Please review the address details and try again so we can show the
                      safest next step for this issue.
                    </p>
                    <div className="action-row">
                      <button
                        type="button"
                        className="secondary-action"
                        onClick={() => setStep('location')}
                      >
                        Back to address details
                      </button>
                      <button
                        type="button"
                        className="primary-action"
                        onClick={() => void handleLocationSubmit()}
                      >
                        Try loading guidance again
                      </button>
                    </div>
                  </section>
                ) : null}

                {guidanceStatus === 'ready' && guidance && classification ? (
                  <ContainmentGuidancePanel
                    guidance={guidance}
                    onBack={() => setStep('location')}
                    onContinue={() => void handleContinueToReview()}
                  />
                ) : null}
              </>
            ) : null}

            {step === 'review' ? (
              <>
                {reviewStatus === 'loading' ? (
                  <section className="panel status-panel" aria-live="polite">
                    Loading your request review summary...
                  </section>
                ) : null}

                {reviewStatus === 'error' || !reviewSummary ? (
                  <section className="panel result-panel result-panel--recovery" aria-live="polite">
                    <p className="next-step-kicker">Review summary unavailable</p>
                    <h2>We couldn&apos;t load the request review summary right now.</h2>
                    <p className="guided-copy">
                      Please return to the containment step and try again so we can show the
                      latest ETA, pricing, and request details before confirmation.
                    </p>
                    <div className="action-row">
                      <button
                        type="button"
                        className="secondary-action"
                        onClick={() => setStep('guidance')}
                      >
                        Back to containment guidance
                      </button>
                      <button
                        type="button"
                        className="primary-action"
                        onClick={() => void handleContinueToReview()}
                      >
                        Try loading review again
                      </button>
                    </div>
                  </section>
                ) : null}

                {reviewStatus === 'ready' && reviewSummary ? (
                  <RequestReviewPanel
                    summary={reviewSummary}
                    onEdit={handleEditTarget}
                    onBack={() => setStep('guidance')}
                    onConfirm={() => void handleConfirmRequest()}
                    onDone={() => {
                      resetFlowState()
                      setSelectedIssueId(null)
                    }}
                    onTrackRequest={() => {
                      if (confirmedRequest) {
                        onOpenTracking(confirmedRequest)
                      }
                    }}
                    confirmationState={requestSubmissionStatus}
                    confirmationError={requestSubmissionError}
                    confirmationRecoveryHint={requestSubmissionRecoveryHint}
                    confirmedRequest={confirmedRequest}
                    savedTrackedRequest={savedTrackedRequest}
                  />
                ) : null}
              </>
            ) : null}
          </>
        ) : null}
      </section>
    </main>
  )
}
