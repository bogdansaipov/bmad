import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import * as containmentGuidanceApi from '../features/containment-guidance/containment-guidance-api'
import * as issueTypesApi from '../features/issue-intake/issue-types-api'
import * as requestTrackingApi from '../features/request-tracking/request-tracking-api'
import * as requestConfirmationApi from '../features/request-review/request-confirmation-api'
import * as requestReviewApi from '../features/request-review/request-review-api'
import { App } from './App'

describe('App', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
    window.localStorage.clear()
  })

  function mockContainmentGuidance({
    variant = 'informational',
    headline = 'Keep the water under control while we prepare the next step.',
  }: {
    variant?: 'informational' | 'warning' | 'recovery'
    headline?: string
  } = {}) {
    vi.spyOn(containmentGuidanceApi, 'loadContainmentGuidance').mockResolvedValue({
      issueTypeId: 'slow-drain',
      serviceabilityStatus: variant === 'recovery' ? 'needsRecovery' : 'serviceable',
      nextStep: variant === 'recovery' ? 'showRecoveryPath' : 'continueToContainment',
      variant,
      headline,
      intro: 'These are the safest next steps to help reduce damage right now.',
      steps: [
        {
          title: 'Stop using the fixture for now',
          detail: 'Pause water use until the blockage is better understood.',
        },
        {
          title: 'Place a towel nearby',
          detail: 'This helps catch minor overflow or splashing.',
        },
      ],
      warnings:
        variant === 'informational'
          ? []
          : [
              {
                title: 'If the water rises quickly',
                detail: 'Pause here and follow the recovery path instead of continuing.',
              },
            ],
      reassurance: 'You do not need to figure this out alone. We will keep the next step simple.',
      nextActionLabel: variant === 'recovery' ? 'See recovery options' : 'Continue to request review',
      nextActionHint:
        variant === 'recovery'
          ? 'We will guide you to the safest fallback path next.'
          : 'Next, we will summarize timing, pricing expectations, and your request details.',
    })
  }

  function mockRequestReviewSummary() {
    return vi.spyOn(requestReviewApi, 'loadRequestReviewSummary').mockResolvedValue({
      issueTypeId: 'slow-drain',
      issueLabel: 'Slow drain',
      headline: 'Review the request details before you confirm.',
      intro:
        'This is a quick final check of what we will submit, what timing usually looks like, and how pricing is handled before any additional work is approved.',
      sections: [
        {
          title: 'Issue details',
          editTarget: 'issueDetails',
          editLabel: 'Edit issue details',
          items: [
            {
              label: 'Selected issue',
              value: 'Slow drain',
            },
            {
              label: 'Is only one drain running slowly?',
              value: 'Yes',
            },
          ],
        },
        {
          title: 'Service location',
          editTarget: 'serviceLocation',
          editLabel: 'Edit service location',
          items: [
            {
              label: 'Street address',
              value: '15 Spring Street',
            },
            {
              label: 'City',
              value: 'New York',
            },
            {
              label: 'ZIP code',
              value: '10011',
            },
          ],
        },
      ],
      eta: {
        label: 'Estimated response window',
        value: 'Usually within 2 to 4 hours',
        detail: 'Single-drain slowdowns are usually manageable for a short period.',
      },
      pricing: {
        label: 'Pricing expectation',
        value: 'Most visits start with an $89 to $139 assessment',
        detail: 'Any added work is confirmed before you approve it.',
      },
      nextSteps: {
        title: 'What happens next',
        detail: 'After confirmation, Handrix creates the request and moves it into review.',
        bullets: [
          'Your issue details and service location are packaged into the request.',
          'Operations reviews the request and confirms the best fulfillment path.',
        ],
      },
      confirmationLabel: 'Confirm request',
      confirmationHint:
        'You can still go back to edit the details above before you confirm.',
    })
  }

  function mockRequestConfirmation() {
    return vi.spyOn(requestConfirmationApi, 'submitAnonymousRequest').mockResolvedValue({
      publicId: 'hrx_test_12345',
      issueTypeId: 'slow-drain',
      issueLabel: 'Slow drain',
      publicStatus: 'received',
      publicStatusLabel: 'Request received',
      publicStatusDetail:
        'Our team is reviewing your issue details and service location so we can confirm the best next step.',
      createdAt: '2026-04-14T13:00:00.000Z',
      confirmationHeadline: 'Your request has been received.',
      confirmationDetail:
        'Handrix has your issue details and service location, and the request is now in the intake review queue.',
      nextStepDetail:
        'You can come back to track this request later without creating an account.',
      trackingCredential: {
        token: 'signed.token',
        expiresAt: '2026-05-14T13:00:00.000Z',
      },
    })
  }

  function mockRequestTracking() {
    return vi.spyOn(requestTrackingApi, 'loadRequestStatus').mockResolvedValue({
      publicId: 'hrx_test_12345',
      issueLabel: 'Slow drain',
      publicStatus: 'received',
      publicStatusLabel: 'Request received',
      publicStatusDetail:
        'Our team is reviewing your issue details and service location so we can confirm the best next step.',
      createdAt: '2026-04-14T13:00:00.000Z',
      updatedAt: '2026-04-14T13:00:00.000Z',
      nextStepDetail:
        'Handrix is reviewing your request details and service location before the next update.',
      latestChangeSummary:
        'Customer confirmed the anonymous request through the guided review flow.',
      timeline: [
        {
          publicStatus: 'received',
          publicStatusLabel: 'Request received',
          publicStatusDetail:
            'Our team is reviewing your issue details and service location so we can confirm the best next step.',
          happenedAt: '2026-04-14T13:00:00.000Z',
          isCurrent: true,
          changeSummary:
            'Customer confirmed the anonymous request through the guided review flow.',
        },
      ],
    })
  }

  it('renders only supported issue options with plain-language copy', async () => {
    vi.spyOn(issueTypesApi, 'loadIssueTypes').mockResolvedValue([
      {
        id: 'dripping-faucet',
        label: 'Dripping faucet',
        shortDescription: 'Water will not fully shut off at a sink or fixture.',
        urgencyCue: 'Low urgency',
      },
      {
        id: 'clogged-toilet',
        label: 'Clogged toilet',
        shortDescription: 'A toilet is blocked or close to overflowing.',
        urgencyCue: 'Priority help',
      },
    ])
    vi.spyOn(issueTypesApi, 'loadIntakeQuestionSet').mockResolvedValue({
      issueTypeId: 'dripping-faucet',
      title: 'A few quick faucet details',
      questions: [
        {
          id: 'singleFixture',
          issueTypeId: 'dripping-faucet',
          prompt: 'Is the dripping coming from one faucet only?',
          helperText: 'We use this to keep the request within the MVP plumbing scope.',
          responseType: 'boolean',
          required: true,
        },
      ],
    })
    mockContainmentGuidance()

    render(<App />)

    expect(
      screen.getByRole('heading', {
        name: /what plumbing issue do you need help with/i,
      }),
    ).toBeInTheDocument()

    expect(await screen.findByRole('button', { name: /dripping faucet/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /clogged toilet/i })).toBeInTheDocument()
    expect(
      screen.getByText('Water will not fully shut off at a sink or fixture.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/water heater replacement/i)).not.toBeInTheDocument()
  })

  it('shows only the issue-relevant follow-up questions after selection', async () => {
    vi.spyOn(issueTypesApi, 'loadIssueTypes').mockResolvedValue([
      {
        id: 'under-sink-leak',
        label: 'Leak under sink',
        shortDescription: 'Water is pooling or dripping under a kitchen or bathroom sink.',
        urgencyCue: 'Act quickly',
      },
      {
        id: 'slow-drain',
        label: 'Slow drain',
        shortDescription: 'Water drains slowly from a sink, tub, or shower.',
        urgencyCue: 'Low urgency',
      },
    ])
    vi.spyOn(issueTypesApi, 'loadIntakeQuestionSet').mockResolvedValue({
      issueTypeId: 'under-sink-leak',
      title: 'A few quick leak details',
      questions: [
        {
          id: 'containedToSink',
          issueTypeId: 'under-sink-leak',
          prompt: 'Is the leak staying under one sink cabinet?',
          helperText: 'This keeps the flow within the MVP plumbing scope.',
          responseType: 'boolean',
          required: true,
        },
        {
          id: 'activePooling',
          issueTypeId: 'under-sink-leak',
          prompt: 'Is water actively pooling right now?',
          helperText: 'This helps us prioritize the next step.',
          responseType: 'boolean',
          required: true,
        },
      ],
    })
    mockContainmentGuidance()

    render(<App />)

    const leakOption = await screen.findByRole('button', { name: /leak under sink/i })
    fireEvent.click(leakOption)

    await waitFor(() => expect(leakOption).toHaveAttribute('aria-pressed', 'true'))
    expect(
      await screen.findByRole('heading', { name: /a few quick leak details/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/is the leak staying under one sink cabinet/i),
    ).toBeInTheDocument()
    expect(screen.queryByText(/is only one drain running slowly/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /yes/i })).toBeInTheDocument()
  })

  it('validates service-location fields with clear feedback', async () => {
    vi.spyOn(issueTypesApi, 'loadIssueTypes').mockResolvedValue([
      {
        id: 'slow-drain',
        label: 'Slow drain',
        shortDescription: 'Water drains slowly from a sink, tub, or shower.',
        urgencyCue: 'Low urgency',
      },
    ])
    vi.spyOn(issueTypesApi, 'loadIntakeQuestionSet').mockResolvedValue({
      issueTypeId: 'slow-drain',
      title: 'A few quick drain details',
      questions: [
        {
          id: 'singleDrainAffected',
          issueTypeId: 'slow-drain',
          prompt: 'Is only one drain running slowly?',
          helperText: 'Multiple affected drains can indicate a larger issue.',
          responseType: 'boolean',
          required: true,
        },
      ],
    })
    vi.spyOn(issueTypesApi, 'evaluateIntake').mockResolvedValue({
      issueTypeId: 'slow-drain',
      serviceabilityStatus: 'serviceable',
      nextStep: 'continueToContainment',
      summaryHeadline: 'This request can keep moving through the guided flow.',
      summaryDetail: 'You are still within the supported plumbing scope.',
    })
    mockContainmentGuidance()

    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: /slow drain/i }))
    fireEvent.click(await screen.findByRole('button', { name: /yes/i }))
    fireEvent.click(screen.getByRole('button', { name: /continue to address/i }))
    fireEvent.click(await screen.findByRole('button', { name: /check coverage and continue/i }))

    expect(
      await screen.findByText(/enter the street address where help is needed/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/enter the city for this service address/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/enter a 5-digit zip code so we can check the service area/i),
    ).toBeInTheDocument()
    expect(issueTypesApi.evaluateIntake).not.toHaveBeenCalled()
  })

  it('shows a recovery-ready result when the intake evaluation is out of area', async () => {
    vi.spyOn(issueTypesApi, 'loadIssueTypes').mockResolvedValue([
      {
        id: 'dripping-faucet',
        label: 'Dripping faucet',
        shortDescription: 'Water keeps dripping from a sink or fixture that should be off.',
        urgencyCue: 'Usually manageable',
      },
    ])
    vi.spyOn(issueTypesApi, 'loadIntakeQuestionSet').mockResolvedValue({
      issueTypeId: 'dripping-faucet',
      title: 'A few quick faucet details',
      questions: [
        {
          id: 'singleFixture',
          issueTypeId: 'dripping-faucet',
          prompt: 'Is the dripping coming from one faucet only?',
          helperText: 'We use this to keep the request within scope.',
          responseType: 'boolean',
          required: true,
        },
      ],
    })
    vi.spyOn(issueTypesApi, 'evaluateIntake').mockResolvedValue({
      issueTypeId: 'dripping-faucet',
      serviceabilityStatus: 'outOfArea',
      nextStep: 'showRecoveryPath',
      summaryHeadline: 'This address is outside the current Handrix service area.',
      summaryDetail: 'We can still guide you toward the recovery path.',
      recoveryCode: 'OUT_OF_SERVICE_AREA',
    })
    mockContainmentGuidance({ variant: 'recovery' })

    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: /dripping faucet/i }))
    fireEvent.click(await screen.findByRole('button', { name: /yes/i }))
    fireEvent.click(screen.getByRole('button', { name: /continue to address/i }))

    fireEvent.change(screen.getByLabelText(/street address/i), {
      target: { value: '77 Main Street' },
    })
    fireEvent.change(screen.getByLabelText(/^city$/i), {
      target: { value: 'Newark' },
    })
    fireEvent.change(screen.getByLabelText(/zip code/i), {
      target: { value: '07102' },
    })

    fireEvent.click(screen.getByRole('button', { name: /check coverage and continue/i }))

    expect(
      await screen.findByRole('heading', {
        name: /keep the water under control while we prepare the next step/i,
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(/if the water rises quickly/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /see recovery options/i })).toBeInTheDocument()
  })

  it('loads the request review summary after containment guidance continues', async () => {
    vi.spyOn(issueTypesApi, 'loadIssueTypes').mockResolvedValue([
      {
        id: 'slow-drain',
        label: 'Slow drain',
        shortDescription: 'Water drains slowly from a sink, tub, or shower.',
        urgencyCue: 'Low urgency',
      },
    ])
    vi.spyOn(issueTypesApi, 'loadIntakeQuestionSet').mockResolvedValue({
      issueTypeId: 'slow-drain',
      title: 'A few quick drain details',
      questions: [
        {
          id: 'singleDrainAffected',
          issueTypeId: 'slow-drain',
          prompt: 'Is only one drain running slowly?',
          helperText: 'Multiple affected drains can indicate a larger issue.',
          responseType: 'boolean',
          required: true,
        },
      ],
    })
    vi.spyOn(issueTypesApi, 'evaluateIntake').mockResolvedValue({
      issueTypeId: 'slow-drain',
      serviceabilityStatus: 'serviceable',
      nextStep: 'continueToContainment',
      summaryHeadline: 'This request can keep moving through the guided flow.',
      summaryDetail: 'You are still within the supported plumbing scope.',
    })
    const loadContainmentGuidance = vi
      .spyOn(containmentGuidanceApi, 'loadContainmentGuidance')
      .mockResolvedValue({
        issueTypeId: 'slow-drain',
        serviceabilityStatus: 'serviceable',
        nextStep: 'continueToContainment',
        variant: 'informational',
        headline: 'Keep the water under control while we prepare the next step.',
        intro: 'These are the safest next steps to help reduce damage right now.',
        steps: [
          {
            title: 'Stop using the fixture for now',
            detail: 'Pause water use until the blockage is better understood.',
          },
        ],
        warnings: [],
        reassurance:
          'You do not need to figure this out alone. We will keep the next step simple.',
        nextActionLabel: 'Continue to request review',
        nextActionHint:
          'Next, we will summarize timing, pricing expectations, and your request details.',
      })
    const loadRequestReviewSummary = mockRequestReviewSummary()

    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: /slow drain/i }))
    fireEvent.click(await screen.findByRole('button', { name: /yes/i }))
    fireEvent.click(screen.getByRole('button', { name: /continue to address/i }))
    fireEvent.change(screen.getByLabelText(/street address/i), {
      target: { value: '15 Spring Street' },
    })
    fireEvent.change(screen.getByLabelText(/^city$/i), {
      target: { value: 'New York' },
    })
    fireEvent.change(screen.getByLabelText(/zip code/i), {
      target: { value: '10011' },
    })

    fireEvent.click(screen.getByRole('button', { name: /check coverage and continue/i }))

    expect(
      await screen.findByRole('heading', {
        name: /keep the water under control while we prepare the next step/i,
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(/stop using the fixture for now/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continue to request review/i })).toBeInTheDocument()
    expect(loadContainmentGuidance).toHaveBeenCalledWith('slow-drain', {
      serviceabilityStatus: 'serviceable',
      nextStep: 'continueToContainment',
      recoveryCode: undefined,
    })

    fireEvent.click(screen.getByRole('button', { name: /continue to request review/i }))

    expect(
      await screen.findByRole('heading', {
        name: /review the request details before you confirm/i,
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(/usually within 2 to 4 hours/i)).toBeInTheDocument()
    expect(screen.getByText(/most visits start with an \$89 to \$139 assessment/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /edit issue details/i })).toBeInTheDocument()
    expect(loadRequestReviewSummary).toHaveBeenCalledWith({
      issueTypeId: 'slow-drain',
      answers: [{ questionId: 'singleDrainAffected', value: true }],
      serviceLocation: {
        addressLine1: '15 Spring Street',
        city: 'New York',
        postalCode: '10011',
        unitOrAccessNote: '',
        locationDetails: '',
      },
      classification: {
        issueTypeId: 'slow-drain',
        serviceabilityStatus: 'serviceable',
        nextStep: 'continueToContainment',
        summaryHeadline: 'This request can keep moving through the guided flow.',
        summaryDetail: 'You are still within the supported plumbing scope.',
      },
    })
  })

  it('shows a customer-safe confirmation state after request submission', async () => {
    vi.spyOn(issueTypesApi, 'loadIssueTypes').mockResolvedValue([
      {
        id: 'slow-drain',
        label: 'Slow drain',
        shortDescription: 'Water drains slowly from a sink, tub, or shower.',
        urgencyCue: 'Low urgency',
      },
    ])
    vi.spyOn(issueTypesApi, 'loadIntakeQuestionSet').mockResolvedValue({
      issueTypeId: 'slow-drain',
      title: 'A few quick drain details',
      questions: [
        {
          id: 'singleDrainAffected',
          issueTypeId: 'slow-drain',
          prompt: 'Is only one drain running slowly?',
          helperText: 'Multiple affected drains can indicate a larger issue.',
          responseType: 'boolean',
          required: true,
        },
      ],
    })
    vi.spyOn(issueTypesApi, 'evaluateIntake').mockResolvedValue({
      issueTypeId: 'slow-drain',
      serviceabilityStatus: 'serviceable',
      nextStep: 'continueToContainment',
      summaryHeadline: 'This request can keep moving through the guided flow.',
      summaryDetail: 'You are still within the supported plumbing scope.',
    })
    mockContainmentGuidance()
    mockRequestReviewSummary()
    mockRequestConfirmation()

    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: /slow drain/i }))
    fireEvent.click(await screen.findByRole('button', { name: /yes/i }))
    fireEvent.click(screen.getByRole('button', { name: /continue to address/i }))
    fireEvent.change(screen.getByLabelText(/street address/i), {
      target: { value: '15 Spring Street' },
    })
    fireEvent.change(screen.getByLabelText(/^city$/i), {
      target: { value: 'New York' },
    })
    fireEvent.change(screen.getByLabelText(/zip code/i), {
      target: { value: '10011' },
    })

    fireEvent.click(screen.getByRole('button', { name: /check coverage and continue/i }))
    fireEvent.click(await screen.findByRole('button', { name: /continue to request review/i }))
    fireEvent.click(await screen.findByRole('button', { name: /confirm request/i }))

    expect(
      await screen.findByRole('heading', { name: /your request has been received/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        /our team is reviewing your issue details and service location so we can confirm the best next step/i,
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        level: 3,
        name: 'Request received',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByLabelText('Confirmed request details'),
    ).toHaveTextContent('Slow drain')
    expect(screen.getByText('hrx_test_12345')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /slow drain/i })).not.toBeInTheDocument()
    expect(
      screen.getByText(/you can come back to track this request later without creating an account/i),
    ).toBeInTheDocument()
    expect(screen.queryByText(/^received$/i)).not.toBeInTheDocument()
    expect(
      screen.queryByText(/your signed tracking credential is now stored for the app handoff/i),
    ).not.toBeInTheDocument()
  })

  it('opens the request-tracking view from confirmation and uses the saved tracking identity', async () => {
    vi.spyOn(issueTypesApi, 'loadIssueTypes').mockResolvedValue([
      {
        id: 'slow-drain',
        label: 'Slow drain',
        shortDescription: 'Water drains slowly from a sink, tub, or shower.',
        urgencyCue: 'Low urgency',
      },
    ])
    vi.spyOn(issueTypesApi, 'loadIntakeQuestionSet').mockResolvedValue({
      issueTypeId: 'slow-drain',
      title: 'A few quick drain details',
      questions: [
        {
          id: 'singleDrainAffected',
          issueTypeId: 'slow-drain',
          prompt: 'Is only one drain running slowly?',
          helperText: 'Multiple affected drains can indicate a larger issue.',
          responseType: 'boolean',
          required: true,
        },
      ],
    })
    vi.spyOn(issueTypesApi, 'evaluateIntake').mockResolvedValue({
      issueTypeId: 'slow-drain',
      serviceabilityStatus: 'serviceable',
      nextStep: 'continueToContainment',
      summaryHeadline: 'This request can keep moving through the guided flow.',
      summaryDetail: 'You are still within the supported plumbing scope.',
    })
    mockContainmentGuidance()
    mockRequestReviewSummary()
    mockRequestConfirmation()
    const loadRequestStatus = mockRequestTracking()

    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: /slow drain/i }))
    fireEvent.click(await screen.findByRole('button', { name: /yes/i }))
    fireEvent.click(screen.getByRole('button', { name: /continue to address/i }))
    fireEvent.change(screen.getByLabelText(/street address/i), {
      target: { value: '15 Spring Street' },
    })
    fireEvent.change(screen.getByLabelText(/^city$/i), {
      target: { value: 'New York' },
    })
    fireEvent.change(screen.getByLabelText(/zip code/i), {
      target: { value: '10011' },
    })

    fireEvent.click(screen.getByRole('button', { name: /check coverage and continue/i }))
    fireEvent.click(await screen.findByRole('button', { name: /continue to request review/i }))
    fireEvent.click(await screen.findByRole('button', { name: /confirm request/i }))
    fireEvent.click(await screen.findByRole('button', { name: /open request status/i }))

    expect(
      await screen.findByRole('heading', { name: /check your request status/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/handrix is reviewing your request details/i)).toBeInTheDocument()
    expect(screen.getByText(/progress timeline/i)).toBeInTheDocument()
    expect(
      screen.getAllByText(/customer confirmed the anonymous request through the guided review flow/i),
    ).toHaveLength(3)
    expect(loadRequestStatus).toHaveBeenCalledWith(
      {
        publicId: 'hrx_test_12345',
        trackingToken: 'signed.token',
      },
      expect.any(AbortSignal),
    )
  })

  it('refreshes the request timeline in place and surfaces meaningful status changes', async () => {
    window.localStorage.setItem(
      'handrix.latestTrackedRequest',
      JSON.stringify({
        publicId: 'hrx_test_12345',
        issueLabel: 'Slow drain',
        trackingToken: 'signed.token',
        trackingExpiresAt: '2026-05-14T13:00:00.000Z',
      }),
    )
    vi.spyOn(issueTypesApi, 'loadIssueTypes').mockResolvedValue([
      {
        id: 'slow-drain',
        label: 'Slow drain',
        shortDescription: 'Water drains slowly from a sink, tub, or shower.',
        urgencyCue: 'Low urgency',
      },
    ])
    const loadRequestStatus = vi
      .spyOn(requestTrackingApi, 'loadRequestStatus')
      .mockResolvedValueOnce({
        publicId: 'hrx_test_12345',
        issueLabel: 'Slow drain',
        publicStatus: 'received',
        publicStatusLabel: 'Request received',
        publicStatusDetail:
          'Our team is reviewing your issue details and service location so we can confirm the best next step.',
        createdAt: '2026-04-14T13:00:00.000Z',
        updatedAt: '2026-04-14T13:00:00.000Z',
        nextStepDetail:
          'Handrix is reviewing your request details and service location before the next update.',
        latestChangeSummary:
          'Customer confirmed the anonymous request through the guided review flow.',
        recoveryState: null,
        timeline: [
          {
            publicStatus: 'received',
            publicStatusLabel: 'Request received',
            publicStatusDetail:
              'Our team is reviewing your issue details and service location so we can confirm the best next step.',
            happenedAt: '2026-04-14T13:00:00.000Z',
            isCurrent: true,
            changeSummary:
              'Customer confirmed the anonymous request through the guided review flow.',
          },
        ],
      })
      .mockResolvedValueOnce({
        publicId: 'hrx_test_12345',
        issueLabel: 'Slow drain',
        publicStatus: 'delayed',
        publicStatusLabel: 'Dispatch delayed',
        publicStatusDetail:
          'This request is still active, but the expected progress timing has changed and the next update should explain the revised expectation clearly.',
        createdAt: '2026-04-14T13:00:00.000Z',
        updatedAt: '2026-04-14T13:30:00.000Z',
        nextStepDetail:
          'This request is still active, but the next service update may take longer than originally expected while Handrix works through the delay.',
        latestChangeSummary:
          'Arrival timing is taking longer than first expected while the route is rechecked.',
        recoveryState: {
          kind: 'delay',
          title: 'This request is still moving, but the timing has changed.',
          detail:
            'The service path is still active, but a delay now affects when the next milestone can happen.',
          expectationUpdate:
            'Expect a slower next update than originally expected while Handrix works through the delay.',
          nextActionLabel: 'Watch for the revised update',
          nextActionDetail:
            'Handrix will share the next timing update as soon as the revised fulfillment path is confirmed.',
          fallbackGuidance:
            'If timing changes create a new concern, use the next Handrix update to decide whether the current request should continue or shift to a safer fallback path.',
        },
        timeline: [
          {
            publicStatus: 'received',
            publicStatusLabel: 'Request received',
            publicStatusDetail:
              'Our team is reviewing your issue details and service location so we can confirm the best next step.',
            happenedAt: '2026-04-14T13:00:00.000Z',
            isCurrent: false,
            changeSummary:
              'Customer confirmed the anonymous request through the guided review flow.',
          },
          {
            publicStatus: 'delayed',
            publicStatusLabel: 'Dispatch delayed',
            publicStatusDetail:
              'This request is still active, but the expected progress timing has changed and the next update should explain the revised expectation clearly.',
            happenedAt: '2026-04-14T13:30:00.000Z',
            isCurrent: true,
            changeSummary:
              'Arrival timing is taking longer than first expected while the route is rechecked.',
          },
        ],
      })

    render(<App />)

    const openSavedRequestButton = await screen.findByRole('button', {
      name: /open saved request status/i,
    })

    vi.useFakeTimers()
    await act(async () => {
      fireEvent.click(openSavedRequestButton)
      await Promise.resolve()
    })

    expect(screen.getByText(/latest update: customer confirmed/i)).toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000)
      await Promise.resolve()
    })

    expect(loadRequestStatus).toHaveBeenCalledTimes(2)
    expect(
      screen.getByRole('heading', { name: /dispatch delayed/i, level: 2 }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/updated: this request is still moving, but the timing has changed/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/recovery update/i)).toBeInTheDocument()
    expect(screen.getByText(/watch for the revised update/i)).toBeInTheDocument()
    expect(screen.getByText(/completed step/i)).toBeInTheDocument()
    expect(screen.getByText(/current step/i)).toBeInTheDocument()
  })

  it('renders a dedicated recovery card for unavailable tracked requests without falling back to the invalid-token state', async () => {
    window.localStorage.setItem(
      'handrix.latestTrackedRequest',
      JSON.stringify({
        publicId: 'hrx_test_12345',
        issueLabel: 'Slow drain',
        trackingToken: 'signed.token',
        trackingExpiresAt: '2026-05-14T13:00:00.000Z',
      }),
    )
    vi.spyOn(issueTypesApi, 'loadIssueTypes').mockResolvedValue([
      {
        id: 'slow-drain',
        label: 'Slow drain',
        shortDescription: 'Water drains slowly from a sink, tub, or shower.',
        urgencyCue: 'Low urgency',
      },
    ])
    vi.spyOn(requestTrackingApi, 'loadRequestStatus').mockResolvedValue({
      publicId: 'hrx_test_12345',
      issueLabel: 'Slow drain',
      publicStatus: 'unavailable',
      publicStatusLabel: 'Service unavailable',
      publicStatusDetail:
        'This request cannot move forward through the current service path, and the next update should explain the best fallback option.',
      createdAt: '2026-04-14T13:00:00.000Z',
      updatedAt: '2026-04-14T14:00:00.000Z',
      nextStepDetail:
        'This request cannot continue through the current service path, and the next update should explain the safest fallback option.',
      latestChangeSummary:
        'This service path is no longer available for the current request details.',
      recoveryState: {
        kind: 'unavailable',
        title: 'This request cannot continue through the current service path.',
        detail:
          'The current fulfillment route is no longer available, so this request needs a different next step instead of normal dispatch progress.',
        expectationUpdate:
          'Do not expect standard dispatch updates while Handrix points you toward the safest fallback option.',
        nextActionLabel: 'Review the fallback path',
        nextActionDetail:
          'Use the fallback guidance below to decide the best next move for this request.',
        fallbackGuidance:
          'Review the fallback path carefully before deciding whether to start a new request or seek a different support option.',
      },
      timeline: [
        {
          publicStatus: 'received',
          publicStatusLabel: 'Request received',
          publicStatusDetail:
            'Our team is reviewing your issue details and service location so we can confirm the best next step.',
          happenedAt: '2026-04-14T13:00:00.000Z',
          isCurrent: false,
          changeSummary:
            'Customer confirmed the anonymous request through the guided review flow.',
        },
        {
          publicStatus: 'unavailable',
          publicStatusLabel: 'Service unavailable',
          publicStatusDetail:
            'This request cannot move forward through the current service path, and the next update should explain the best fallback option.',
          happenedAt: '2026-04-14T14:00:00.000Z',
          isCurrent: true,
          changeSummary:
            'This service path is no longer available for the current request details.',
        },
      ],
    })

    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: /open saved request status/i }))

    expect(
      await screen.findByRole('heading', {
        name: /this request cannot continue through the current service path/i,
        level: 3,
      }),
    ).toBeInTheDocument()
    expect(screen.getAllByText(/review the fallback path carefully/i)).toHaveLength(2)
    expect(screen.getByText(/next best action/i)).toBeInTheDocument()
    expect(screen.queryByText(/we couldn't reopen that request status right now/i)).not.toBeInTheDocument()
  })

  it('shows a saved-request entry point on the issue list after confirmation on the same device', async () => {
    vi.spyOn(issueTypesApi, 'loadIssueTypes').mockResolvedValue([
      {
        id: 'slow-drain',
        label: 'Slow drain',
        shortDescription: 'Water drains slowly from a sink, tub, or shower.',
        urgencyCue: 'Low urgency',
      },
    ])
    vi.spyOn(issueTypesApi, 'loadIntakeQuestionSet').mockResolvedValue({
      issueTypeId: 'slow-drain',
      title: 'A few quick drain details',
      questions: [
        {
          id: 'singleDrainAffected',
          issueTypeId: 'slow-drain',
          prompt: 'Is only one drain running slowly?',
          helperText: 'Multiple affected drains can indicate a larger issue.',
          responseType: 'boolean',
          required: true,
        },
      ],
    })
    vi.spyOn(issueTypesApi, 'evaluateIntake').mockResolvedValue({
      issueTypeId: 'slow-drain',
      serviceabilityStatus: 'serviceable',
      nextStep: 'continueToContainment',
      summaryHeadline: 'This request can keep moving through the guided flow.',
      summaryDetail: 'You are still within the supported plumbing scope.',
    })
    mockContainmentGuidance()
    mockRequestReviewSummary()
    mockRequestConfirmation()

    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: /slow drain/i }))
    fireEvent.click(await screen.findByRole('button', { name: /yes/i }))
    fireEvent.click(screen.getByRole('button', { name: /continue to address/i }))
    fireEvent.change(screen.getByLabelText(/street address/i), {
      target: { value: '15 Spring Street' },
    })
    fireEvent.change(screen.getByLabelText(/^city$/i), {
      target: { value: 'New York' },
    })
    fireEvent.change(screen.getByLabelText(/zip code/i), {
      target: { value: '10011' },
    })

    fireEvent.click(screen.getByRole('button', { name: /check coverage and continue/i }))
    fireEvent.click(await screen.findByRole('button', { name: /continue to request review/i }))
    fireEvent.click(await screen.findByRole('button', { name: /confirm request/i }))
    fireEvent.click(await screen.findByRole('button', { name: /back to issue list/i }))

    expect(
      await screen.findByRole('button', { name: /open saved request status/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/this device still has the last saved tracking identity for slow drain/i),
    ).toBeInTheDocument()
  })

  it('shows a calm recoverable tracking state when the saved tracking identity is invalid', async () => {
    window.localStorage.setItem(
      'handrix.latestTrackedRequest',
      JSON.stringify({
        publicId: 'hrx_test_12345',
        issueLabel: 'Slow drain',
        trackingToken: 'signed.token',
        trackingExpiresAt: '2026-05-14T13:00:00.000Z',
      }),
    )
    vi.spyOn(issueTypesApi, 'loadIssueTypes').mockResolvedValue([
      {
        id: 'slow-drain',
        label: 'Slow drain',
        shortDescription: 'Water drains slowly from a sink, tub, or shower.',
        urgencyCue: 'Low urgency',
      },
    ])
    vi.spyOn(requestTrackingApi, 'loadRequestStatus').mockRejectedValue(
      new requestTrackingApi.RequestTrackingError(
        'We could not open that request status right now.',
        'Please return using the latest request confirmation details or start a new request if needed.',
        'REQUEST_STATUS_LOOKUP_REJECTED',
      ),
    )

    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: /open saved request status/i }))

    expect(
      await screen.findByRole('heading', {
        name: /we couldn't reopen that request status right now/i,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        /please return using the latest request confirmation details or start a new request if needed/i,
      ),
    ).toBeInTheDocument()
    expect(window.localStorage.getItem('handrix.latestTrackedRequest')).toBeNull()
  })

  it('shows warning and recovery guidance without falling back to a generic error state', async () => {
    vi.spyOn(issueTypesApi, 'loadIssueTypes').mockResolvedValue([
      {
        id: 'clogged-toilet',
        label: 'Clogged toilet',
        shortDescription: 'A toilet is blocked or close to overflowing.',
        urgencyCue: 'Priority help',
      },
    ])
    vi.spyOn(issueTypesApi, 'loadIntakeQuestionSet').mockResolvedValue({
      issueTypeId: 'clogged-toilet',
      title: 'A few quick toilet details',
      questions: [
        {
          id: 'singleToiletAffected',
          issueTypeId: 'clogged-toilet',
          prompt: 'Is only one toilet affected?',
          helperText: 'We keep this MVP focused on contained small-plumbing issues.',
          responseType: 'boolean',
          required: true,
        },
      ],
    })
    vi.spyOn(issueTypesApi, 'evaluateIntake').mockResolvedValue({
      issueTypeId: 'clogged-toilet',
      serviceabilityStatus: 'needsRecovery',
      nextStep: 'showRecoveryPath',
      summaryHeadline: 'This request needs a recovery path instead of the standard flow.',
      summaryDetail: 'Based on the details you shared, this looks broader than the MVP scope.',
      recoveryCode: 'UNSUPPORTED_REQUEST_DETAILS',
    })
    vi.spyOn(containmentGuidanceApi, 'loadContainmentGuidance').mockResolvedValue({
      issueTypeId: 'clogged-toilet',
      serviceabilityStatus: 'needsRecovery',
      nextStep: 'showRecoveryPath',
      recoveryCode: 'UNSUPPORTED_REQUEST_DETAILS',
      variant: 'recovery',
      headline: 'Please take a safer recovery step before continuing.',
      intro: 'The details you shared suggest this issue may spread beyond the standard intake path.',
      steps: [
        {
          title: 'Avoid flushing again',
          detail: 'Another flush could push water higher or spread the backup.',
        },
      ],
      warnings: [
        {
          title: 'If wastewater is rising',
          detail: 'Move nearby items away from the area and avoid contact with the water.',
        },
      ],
      reassurance: 'We will keep the next step clear, even if this path needs extra support.',
      nextActionLabel: 'See recovery options',
      nextActionHint: 'We will guide you to the safest fallback path next.',
    })

    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: /clogged toilet/i }))
    fireEvent.click(await screen.findByRole('button', { name: /yes/i }))
    fireEvent.click(screen.getByRole('button', { name: /continue to address/i }))
    fireEvent.change(screen.getByLabelText(/street address/i), {
      target: { value: '88 Atlantic Avenue' },
    })
    fireEvent.change(screen.getByLabelText(/^city$/i), {
      target: { value: 'Brooklyn' },
    })
    fireEvent.change(screen.getByLabelText(/zip code/i), {
      target: { value: '11201' },
    })

    fireEvent.click(screen.getByRole('button', { name: /check coverage and continue/i }))

    expect(
      await screen.findByRole('heading', {
        name: /please take a safer recovery step before continuing/i,
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(/avoid flushing again/i)).toBeInTheDocument()
    expect(screen.getByText(/if wastewater is rising/i)).toBeInTheDocument()
    expect(screen.queryByText(/we couldn't load/i)).not.toBeInTheDocument()
  })

  it('preserves unrelated progress when editing from the review screen', async () => {
    vi.spyOn(issueTypesApi, 'loadIssueTypes').mockResolvedValue([
      {
        id: 'slow-drain',
        label: 'Slow drain',
        shortDescription: 'Water drains slowly from a sink, tub, or shower.',
        urgencyCue: 'Low urgency',
      },
    ])
    vi.spyOn(issueTypesApi, 'loadIntakeQuestionSet').mockResolvedValue({
      issueTypeId: 'slow-drain',
      title: 'A few quick drain details',
      questions: [
        {
          id: 'singleDrainAffected',
          issueTypeId: 'slow-drain',
          prompt: 'Is only one drain running slowly?',
          helperText: 'Multiple affected drains can indicate a larger issue.',
          responseType: 'boolean',
          required: true,
        },
      ],
    })
    vi.spyOn(issueTypesApi, 'evaluateIntake').mockResolvedValue({
      issueTypeId: 'slow-drain',
      serviceabilityStatus: 'serviceable',
      nextStep: 'continueToContainment',
      summaryHeadline: 'This request can keep moving through the guided flow.',
      summaryDetail: 'You are still within the supported plumbing scope.',
    })
    mockContainmentGuidance()
    const loadRequestReviewSummary = mockRequestReviewSummary()

    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: /slow drain/i }))
    fireEvent.click(await screen.findByRole('button', { name: /yes/i }))
    fireEvent.click(screen.getByRole('button', { name: /continue to address/i }))
    fireEvent.change(screen.getByLabelText(/street address/i), {
      target: { value: '15 Spring Street' },
    })
    fireEvent.change(screen.getByLabelText(/^city$/i), {
      target: { value: 'New York' },
    })
    fireEvent.change(screen.getByLabelText(/zip code/i), {
      target: { value: '10011' },
    })
    fireEvent.click(screen.getByRole('button', { name: /check coverage and continue/i }))
    fireEvent.click(await screen.findByRole('button', { name: /continue to request review/i }))

    await screen.findByRole('heading', {
      name: /review the request details before you confirm/i,
    })

    fireEvent.click(screen.getByRole('button', { name: /edit service location/i }))

    expect(await screen.findByRole('heading', { name: /where do you need help/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/street address/i)).toHaveValue('15 Spring Street')
    expect(screen.getByLabelText(/^city$/i)).toHaveValue('New York')
    expect(screen.getByLabelText(/zip code/i)).toHaveValue('10011')

    fireEvent.change(screen.getByLabelText(/street address/i), {
      target: { value: '22 Bleecker Street' },
    })
    fireEvent.click(screen.getByRole('button', { name: /check coverage and continue/i }))
    fireEvent.click(await screen.findByRole('button', { name: /continue to request review/i }))

    await screen.findByRole('heading', {
      name: /review the request details before you confirm/i,
    })
    expect(loadRequestReviewSummary).toHaveBeenLastCalledWith({
      issueTypeId: 'slow-drain',
      answers: [{ questionId: 'singleDrainAffected', value: true }],
      serviceLocation: {
        addressLine1: '22 Bleecker Street',
        city: 'New York',
        postalCode: '10011',
        unitOrAccessNote: '',
        locationDetails: '',
      },
      classification: {
        issueTypeId: 'slow-drain',
        serviceabilityStatus: 'serviceable',
        nextStep: 'continueToContainment',
        summaryHeadline: 'This request can keep moving through the guided flow.',
        summaryDetail: 'You are still within the supported plumbing scope.',
      },
    })
  })

  it('confirms the reviewed request without requiring an account', async () => {
    vi.spyOn(issueTypesApi, 'loadIssueTypes').mockResolvedValue([
      {
        id: 'slow-drain',
        label: 'Slow drain',
        shortDescription: 'Water drains slowly from a sink, tub, or shower.',
        urgencyCue: 'Low urgency',
      },
    ])
    vi.spyOn(issueTypesApi, 'loadIntakeQuestionSet').mockResolvedValue({
      issueTypeId: 'slow-drain',
      title: 'A few quick drain details',
      questions: [
        {
          id: 'singleDrainAffected',
          issueTypeId: 'slow-drain',
          prompt: 'Is only one drain running slowly?',
          helperText: 'Multiple affected drains can indicate a larger issue.',
          responseType: 'boolean',
          required: true,
        },
      ],
    })
    vi.spyOn(issueTypesApi, 'evaluateIntake').mockResolvedValue({
      issueTypeId: 'slow-drain',
      serviceabilityStatus: 'serviceable',
      nextStep: 'continueToContainment',
      summaryHeadline: 'This request can keep moving through the guided flow.',
      summaryDetail: 'You are still within the supported plumbing scope.',
    })
    mockContainmentGuidance()
    mockRequestReviewSummary()
    const submitAnonymousRequest = mockRequestConfirmation()

    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: /slow drain/i }))
    fireEvent.click(await screen.findByRole('button', { name: /yes/i }))
    fireEvent.click(screen.getByRole('button', { name: /continue to address/i }))
    fireEvent.change(screen.getByLabelText(/street address/i), {
      target: { value: '15 Spring Street' },
    })
    fireEvent.change(screen.getByLabelText(/^city$/i), {
      target: { value: 'New York' },
    })
    fireEvent.change(screen.getByLabelText(/zip code/i), {
      target: { value: '10011' },
    })
    fireEvent.click(screen.getByRole('button', { name: /check coverage and continue/i }))
    fireEvent.click(await screen.findByRole('button', { name: /continue to request review/i }))
    fireEvent.click(await screen.findByRole('button', { name: /^confirm request$/i }))

    expect(
      await screen.findByRole('heading', {
        name: /your request has been received/i,
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(/keep this request id handy/i)).toBeInTheDocument()
    expect(submitAnonymousRequest).toHaveBeenCalledTimes(1)
  })

  it('keeps the review state in place when confirmation fails', async () => {
    vi.spyOn(issueTypesApi, 'loadIssueTypes').mockResolvedValue([
      {
        id: 'slow-drain',
        label: 'Slow drain',
        shortDescription: 'Water drains slowly from a sink, tub, or shower.',
        urgencyCue: 'Low urgency',
      },
    ])
    vi.spyOn(issueTypesApi, 'loadIntakeQuestionSet').mockResolvedValue({
      issueTypeId: 'slow-drain',
      title: 'A few quick drain details',
      questions: [
        {
          id: 'singleDrainAffected',
          issueTypeId: 'slow-drain',
          prompt: 'Is only one drain running slowly?',
          helperText: 'Multiple affected drains can indicate a larger issue.',
          responseType: 'boolean',
          required: true,
        },
      ],
    })
    vi.spyOn(issueTypesApi, 'evaluateIntake').mockResolvedValue({
      issueTypeId: 'slow-drain',
      serviceabilityStatus: 'serviceable',
      nextStep: 'continueToContainment',
      summaryHeadline: 'This request can keep moving through the guided flow.',
      summaryDetail: 'You are still within the supported plumbing scope.',
    })
    mockContainmentGuidance()
    mockRequestReviewSummary()
    vi.spyOn(requestConfirmationApi, 'submitAnonymousRequest').mockRejectedValue(
      new requestConfirmationApi.RequestConfirmationError(
        'We could not confirm this request yet.',
        'Please review the latest request details before trying again.',
      ),
    )

    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: /slow drain/i }))
    fireEvent.click(await screen.findByRole('button', { name: /yes/i }))
    fireEvent.click(screen.getByRole('button', { name: /continue to address/i }))
    fireEvent.change(screen.getByLabelText(/street address/i), {
      target: { value: '15 Spring Street' },
    })
    fireEvent.change(screen.getByLabelText(/^city$/i), {
      target: { value: 'New York' },
    })
    fireEvent.change(screen.getByLabelText(/zip code/i), {
      target: { value: '10011' },
    })
    fireEvent.click(screen.getByRole('button', { name: /check coverage and continue/i }))
    fireEvent.click(await screen.findByRole('button', { name: /continue to request review/i }))
    fireEvent.click(await screen.findByRole('button', { name: /^confirm request$/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /we could not confirm this request yet/i,
    )
    expect(
      screen.getByRole('heading', {
        name: /review the request details before you confirm/i,
      }),
    ).toBeInTheDocument()
  })
})
