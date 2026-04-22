import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SupportRequestDetailResponse } from '@handrix/shared-contracts'
import * as supportAuthApi from './support-auth-api'
import * as supportInterventionApi from './support-intervention-api'
import * as supportRequestDetailApi from './support-request-detail-api'
import { SupportRequestDetailScreen } from './support-request-detail-screen'

describe('SupportRequestDetailScreen', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  const session = {
    accessToken: 'signed.support.token',
    tokenType: 'Bearer' as const,
    issuedAt: '2026-04-21T10:00:00.000Z',
    expiresAt: '2026-04-21T18:00:00.000Z',
    user: {
      id: 'support-default-user',
      email: 'support@handrix.local',
      displayName: 'Support Coordinator',
      role: 'support' as const,
    },
  }

  const protectedSession = {
    scope: 'support' as const,
    message: 'Support access granted.',
    user: session.user,
  }

  const detailResponse: SupportRequestDetailResponse = {
    publicId: 'hrx_test',
    issueTypeId: 'slow-drain',
    issueLabel: 'Slow drain',
    createdAt: '2026-04-20T13:00:00.000Z',
    serviceLocation: {
      addressLine1: '15 Spring Street',
      city: 'New York',
      postalCode: '10011',
      unitOrAccessNote: '',
      locationDetails: '',
    },
    currentState: {
      lifecycleState: 'intake_in_review',
      lifecycleStateLabel: 'Intake in review',
      lifecycleStateDetail:
        'Operations is still reviewing the intake details before assignment.',
      publicStatus: 'received',
      publicStatusLabel: 'Request received',
      publicStatusDetail:
        'Our team is reviewing your issue details and service location so we can confirm the best next step.',
    },
    classification: {
      issueTypeId: 'slow-drain',
      serviceabilityStatus: 'serviceable',
      nextStep: 'continueToContainment',
      summaryHeadline: 'This request can keep moving through the guided flow.',
      summaryDetail:
        'You are still within the supported plumbing scope and service area for the next Handrix step.',
    },
    intakeAnswers: [
      {
        questionLabel: 'Is only one drain running slowly?',
        answerLabel: 'Yes',
      },
      {
        questionLabel: 'Is water sitting for more than a few minutes after use?',
        answerLabel: 'Yes',
      },
    ],
    customerContext: {
      containmentGuidance: {
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
      },
      requestReviewSummary: {
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
            items: [{ label: 'Selected issue', value: 'Slow drain' }],
          },
          {
            title: 'Service location',
            editTarget: 'serviceLocation',
            editLabel: 'Edit service location',
            items: [{ label: 'Street address', value: '15 Spring Street' }],
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
          bullets: ['Your issue details and service location are packaged into the request.'],
        },
        confirmationLabel: 'Confirm request',
        confirmationHint:
          'You can still go back to edit the details above before you confirm.',
      },
    },
    assignment: {
      ownerType: 'provider',
      ownerTypeLabel: 'Provider',
      ownerLabel: 'Northstar Plumbing Co.',
      assignedAt: '2026-04-20T13:10:00.000Z',
      note: 'Call ahead before arrival.',
    },
    intervention: {
      kind: 'clarification',
      label: 'Clarification needed',
      detail:
        'The request is waiting on one more customer or operational detail before fulfillment can continue.',
      customerImpact:
        'Support should keep the missing detail visible in follow-up.',
      latestRelevantChange: {
        occurredAt: '2026-04-20T13:05:00.000Z',
        actorType: 'ops',
        changeSummary:
          'Operations flagged the request for clarification before dispatch can continue.',
      },
    },
    explanation: {
      kind: 'clarification',
      label: 'Clarification needed',
      detail:
        'Support can explain that one missing detail is still blocking progress before normal fulfillment can continue.',
      reasonDetail:
        'Operations flagged the request for clarification before dispatch can continue.',
      expectationUpdate:
        'The request will stay paused until the missing detail is confirmed clearly.',
      nextActionLabel: 'Share the missing detail',
      nextActionDetail:
        'Reply with the missing detail so Handrix can continue the request.',
      fallbackGuidance:
        'Keep the affected fixture out of use while we confirm the missing detail.',
      customerVisibleRecovery: {
        kind: 'clarification',
        title: 'Clarification needed',
        detail:
          'We need one more detail before the request can continue moving.',
        expectationUpdate:
          'The request will keep moving as soon as the missing detail is confirmed.',
        nextActionLabel: 'Share the missing detail',
        nextActionDetail:
          'Reply with the missing detail so Handrix can continue the request.',
        fallbackGuidance:
          'Keep the affected fixture out of use while we confirm the missing detail.',
      },
      latestRelevantChange: {
        occurredAt: '2026-04-20T13:05:00.000Z',
        actorType: 'ops',
        changeSummary:
          'Operations flagged the request for clarification before dispatch can continue.',
      },
    },
    latestSupportFollowUp: null,
    history: [
      {
        previousLifecycleState: null,
        nextLifecycleState: 'intake_in_review',
        previousLifecycleStateLabel: null,
        nextLifecycleStateLabel: 'Intake in review',
        previousPublicStatus: null,
        nextPublicStatus: 'received',
        previousPublicStatusLabel: null,
        nextPublicStatusLabel: 'Request received',
        occurredAt: '2026-04-20T13:00:00.000Z',
        actorType: 'customer',
        changeSummary:
          'Customer confirmed the anonymous request through the guided review flow.',
        visibility: 'customer',
        visibilityLabel: 'Customer visible',
        intervention: null,
        customerSnapshot: {
          publicStatus: 'received',
          publicStatusLabel: 'Request received',
          publicStatusDetail:
            'Our team is reviewing your issue details and service location so we can confirm the best next step.',
          nextStepDetail:
            'Handrix is reviewing your request details and service location before the next update.',
          recoveryState: null,
        },
      },
      {
        previousLifecycleState: 'intake_in_review',
        nextLifecycleState: 'clarification_needed',
        previousLifecycleStateLabel: 'Intake in review',
        nextLifecycleStateLabel: 'Clarification needed',
        previousPublicStatus: 'received',
        nextPublicStatus: 'needsClarification',
        previousPublicStatusLabel: 'Request received',
        nextPublicStatusLabel: 'More details needed',
        occurredAt: '2026-04-20T13:05:00.000Z',
        actorType: 'ops',
        changeSummary:
          'Operations flagged the request for clarification before dispatch can continue.',
        visibility: 'customer',
        visibilityLabel: 'Customer visible',
        intervention: {
          kind: 'clarification',
          label: 'Clarification needed',
          detail:
            'Operations flagged the request for clarification before dispatch can continue.',
        },
        customerSnapshot: {
          publicStatus: 'needsClarification',
          publicStatusLabel: 'Clarification needed',
          publicStatusDetail:
            'We need one more detail before we can keep your request moving.',
          nextStepDetail:
            'Handrix will resume review as soon as the missing detail is confirmed.',
          recoveryState: {
            kind: 'clarification',
            title: 'Clarification needed',
            detail:
              'We need one more detail before the request can continue moving.',
            expectationUpdate:
              'The request will keep moving as soon as the missing detail is confirmed.',
            nextActionLabel: 'Share the missing detail',
            nextActionDetail:
              'Reply with the missing detail so Handrix can continue the request.',
            fallbackGuidance:
              'Keep the affected fixture out of use while we confirm the missing detail.',
          },
        },
      },
    ],
    latestChangeSummary:
      'Customer confirmed the anonymous request through the guided review flow.',
    lastUpdatedAt: '2026-04-20T13:05:00.000Z',
  }

  it('renders the full support context after verification', async () => {
    vi.spyOn(supportAuthApi, 'loadSupportProtectedSession').mockResolvedValue(
      protectedSession,
    )
    vi.spyOn(
      supportRequestDetailApi,
      'loadSupportRequestDetail',
    ).mockResolvedValue(detailResponse)

    render(
      <SupportRequestDetailScreen
        publicId="hrx_test"
        session={session}
        onBack={() => undefined}
        onLogout={() => undefined}
        onSessionExpired={() => undefined}
      />,
    )

    expect(
      await screen.findByRole('heading', { name: /slow drain/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /^intake in review$/i }),
    ).toBeInTheDocument()
    expect(screen.getAllByText(/request received/i).length).toBeGreaterThan(0)
    expect(
      screen.getAllByText(
        /customer confirmed the anonymous request through the guided review flow/i,
      ).length,
    ).toBeGreaterThan(0)
    expect(
      screen.getByRole('heading', { name: /northstar plumbing co\./i }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/is only one drain running slowly\?/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/keep the water under control while we prepare the next step/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/most visits start with an \$89 to \$139 assessment/i),
    ).toBeInTheDocument()
    expect(
      screen.getAllByText(/operations flagged the request for clarification/i)
        .length,
    ).toBeGreaterThan(0)
    expect(screen.getAllByText(/clarification needed/i).length).toBeGreaterThan(0)
    expect(
      screen.getByRole('heading', { name: /clarification needed/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/support can explain that one missing detail is still blocking progress/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/^issue details$/i)).toBeInTheDocument()
    expect(screen.getByText(/^selected issue:/i)).toBeInTheDocument()
    expect(
      screen.getByText(/confirm request/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/you can still go back to edit the details above before you confirm/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/intake in review to clarification needed/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/request received to more details needed/i),
    ).toBeInTheDocument()
    expect(screen.getAllByText(/customer visible/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/share the missing detail/i).length).toBeGreaterThan(0)
  })

  it('records a support follow-up and refreshes the detail in place', async () => {
    vi.spyOn(supportAuthApi, 'loadSupportProtectedSession').mockResolvedValue(
      protectedSession,
    )
    vi.spyOn(
      supportRequestDetailApi,
      'loadSupportRequestDetail',
    ).mockResolvedValue(detailResponse)
    const recordSpy = vi.spyOn(
      supportInterventionApi,
      'recordSupportIntervention',
    ).mockResolvedValue({
      ...detailResponse,
      latestChangeSummary:
        'Support confirmed that evening building access is required.',
      lastUpdatedAt: '2026-04-21T10:30:00.000Z',
      latestSupportFollowUp: {
        kind: 'clarification',
        label: 'Clarification needed',
        detail: 'Support confirmed that evening building access is required.',
        recordedAt: '2026-04-21T10:30:00.000Z',
        actorType: 'support',
        visibility: 'internal',
        visibilityLabel: 'Internal only',
        affectsLifecycle: false,
      },
      history: [
        ...detailResponse.history,
        {
          previousLifecycleState: 'clarification_needed',
          nextLifecycleState: 'clarification_needed',
          previousLifecycleStateLabel: 'Clarification needed',
          nextLifecycleStateLabel: 'Clarification needed',
          previousPublicStatus: 'needsClarification',
          nextPublicStatus: 'needsClarification',
          previousPublicStatusLabel: 'More details needed',
          nextPublicStatusLabel: 'More details needed',
          occurredAt: '2026-04-21T10:30:00.000Z',
          actorType: 'support',
          changeSummary:
            'Support confirmed that evening building access is required.',
          visibility: 'internal',
          visibilityLabel: 'Internal only',
          intervention: {
            kind: 'clarification',
            label: 'Clarification needed',
            detail:
              'Support confirmed that evening building access is required.',
          },
          customerSnapshot: detailResponse.history[1]!.customerSnapshot,
        },
      ],
    })

    render(
      <SupportRequestDetailScreen
        publicId="hrx_test"
        session={session}
        onBack={() => undefined}
        onLogout={() => undefined}
        onSessionExpired={() => undefined}
      />,
    )

    await screen.findByRole('heading', { name: /slow drain/i })

    fireEvent.change(screen.getByLabelText(/internal follow-up note/i), {
      target: {
        value: 'Support confirmed that evening building access is required.',
      },
    })
    fireEvent.click(
      screen.getByRole('button', { name: /save follow-up/i }),
    )

    await waitFor(() => {
      expect(recordSpy).toHaveBeenCalledWith('signed.support.token', 'hrx_test', {
        kind: 'clarification',
        note: 'Support confirmed that evening building access is required.',
        updateLifecycle: false,
      })
    })

    expect(
      await screen.findByText(/support follow-up recorded/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/latest support follow-up:/i),
    ).toBeInTheDocument()
    expect(
      screen.getAllByText(/internal only/i).length,
    ).toBeGreaterThan(0)
    expect(
      screen.getAllByText(/support confirmed that evening building access is required/i)
        .length,
    ).toBeGreaterThan(0)
  })

  it('clears stale request detail while a different request is loading', async () => {
    vi.spyOn(supportAuthApi, 'loadSupportProtectedSession').mockResolvedValue(
      protectedSession,
    )

    let resolveSecondDetail: ((value: SupportRequestDetailResponse) => void) | null =
      null
    vi.spyOn(
      supportRequestDetailApi,
      'loadSupportRequestDetail',
    )
      .mockResolvedValueOnce(detailResponse)
      .mockImplementationOnce(
        () =>
          new Promise<SupportRequestDetailResponse>((resolve) => {
            resolveSecondDetail = resolve
          }),
      )

    const nextDetail: SupportRequestDetailResponse = {
      ...detailResponse,
      publicId: 'hrx_other',
      issueLabel: 'Burst pipe',
      latestChangeSummary: 'Operations is reviewing the burst-pipe dispatch delay.',
    }

    const view = render(
      <SupportRequestDetailScreen
        publicId="hrx_test"
        session={session}
        onBack={() => undefined}
        onLogout={() => undefined}
        onSessionExpired={() => undefined}
      />,
    )

    expect(
      await screen.findByRole('heading', { name: /slow drain/i }),
    ).toBeInTheDocument()

    await act(async () => {
      view.rerender(
        <SupportRequestDetailScreen
          publicId="hrx_other"
          session={session}
          onBack={() => undefined}
          onLogout={() => undefined}
          onSessionExpired={() => undefined}
        />,
      )
    })

    expect(
      screen.getAllByRole('heading', { name: /request hrx_other/i }).length,
    ).toBeGreaterThan(0)
    expect(
      screen.getByText(/loading the protected support request detail/i),
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /slow drain/i })).not.toBeInTheDocument()
    expect(
      screen.queryByDisplayValue(/support confirmed/i),
    ).not.toBeInTheDocument()

    await act(async () => {
      resolveSecondDetail?.(nextDetail)
    })

    expect(
      await screen.findByRole('heading', { name: /burst pipe/i }),
    ).toBeInTheDocument()
  })

  it('renders a calm alert for SUPPORT_REQUEST_NOT_FOUND and keeps Back to search visible', async () => {
    vi.spyOn(supportAuthApi, 'loadSupportProtectedSession').mockResolvedValue(
      protectedSession,
    )
    vi.spyOn(
      supportRequestDetailApi,
      'loadSupportRequestDetail',
    ).mockRejectedValue(
      new supportAuthApi.SupportAuthError(
        'We could not open that request right now.',
        'Return to search and choose a request again.',
        'SUPPORT_REQUEST_NOT_FOUND',
      ),
    )

    render(
      <SupportRequestDetailScreen
        publicId="hrx_missing"
        session={session}
        onBack={() => undefined}
        onLogout={() => undefined}
        onSessionExpired={() => undefined}
      />,
    )

    expect(
      await screen.findByText(/we could not open that request right now/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/return to search and choose a request again/i),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /back to search/i }),
    ).toBeInTheDocument()
  })

  it('calls onSessionExpired when the session-verify call is rejected with INTERNAL_AUTH_FORBIDDEN', async () => {
    vi.spyOn(supportAuthApi, 'loadSupportProtectedSession').mockRejectedValue(
      new supportAuthApi.SupportAuthError(
        'This account does not have support access.',
        'Use an authorized staff account for this protected route.',
        'INTERNAL_AUTH_FORBIDDEN',
      ),
    )
    const onSessionExpired = vi.fn()

    render(
      <SupportRequestDetailScreen
        publicId="hrx_test"
        session={session}
        onBack={() => undefined}
        onLogout={() => undefined}
        onSessionExpired={onSessionExpired}
      />,
    )

    await waitFor(() => {
      expect(onSessionExpired).toHaveBeenCalledWith({
        message: 'This account does not have support access.',
        recoveryHint:
          'Use an authorized staff account for this protected route.',
      })
    })
  })

  it('calls onSessionExpired when the detail call is rejected with INTERNAL_AUTH_FORBIDDEN', async () => {
    vi.spyOn(supportAuthApi, 'loadSupportProtectedSession').mockResolvedValue(
      protectedSession,
    )
    vi.spyOn(
      supportRequestDetailApi,
      'loadSupportRequestDetail',
    ).mockRejectedValue(
      new supportAuthApi.SupportAuthError(
        'This account does not have support access.',
        'Use an authorized staff account for this protected route.',
        'INTERNAL_AUTH_FORBIDDEN',
      ),
    )
    const onSessionExpired = vi.fn()

    render(
      <SupportRequestDetailScreen
        publicId="hrx_test"
        session={session}
        onBack={() => undefined}
        onLogout={() => undefined}
        onSessionExpired={onSessionExpired}
      />,
    )

    await waitFor(() => {
      expect(onSessionExpired).toHaveBeenCalledWith({
        message: 'This account does not have support access.',
        recoveryHint:
          'Use an authorized staff account for this protected route.',
      })
    })
  })

  it('invokes onBack and onLogout when their buttons are clicked', async () => {
    vi.spyOn(supportAuthApi, 'loadSupportProtectedSession').mockResolvedValue(
      protectedSession,
    )
    vi.spyOn(
      supportRequestDetailApi,
      'loadSupportRequestDetail',
    ).mockResolvedValue(detailResponse)
    const onBack = vi.fn()
    const onLogout = vi.fn()

    render(
      <SupportRequestDetailScreen
        publicId="hrx_test"
        session={session}
        onBack={onBack}
        onLogout={onLogout}
        onSessionExpired={() => undefined}
      />,
    )

    const backButton = await screen.findByRole('button', {
      name: /back to search/i,
    })
    fireEvent.click(backButton)
    expect(onBack).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: /sign out/i }))
    expect(onLogout).toHaveBeenCalledTimes(1)
  })
})
