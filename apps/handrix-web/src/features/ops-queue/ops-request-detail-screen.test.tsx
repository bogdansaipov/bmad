import { fireEvent, render, screen } from '@testing-library/react'
import type { OpsRequestDetailResponse } from '@handrix/shared-contracts'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as opsAuthApi from './ops-auth-api'
import * as opsRequestDetailApi from './ops-request-detail-api'
import { OpsRequestDetailScreen } from './ops-request-detail-screen'

function buildTransitionOption(
  override: Partial<OpsRequestDetailResponse['availableTransitions'][number]>,
): OpsRequestDetailResponse['availableTransitions'][number] {
  return {
    nextLifecycleState: 'intake_in_review',
    actionLabel: 'Mark ready for assignment',
    actionDetail:
      'Complete the intake review so this request can move into assignment without resetting the customer timeline.',
    nextLifecycleStateLabel: 'Intake in review',
    nextLifecycleStateDetail:
      'Operations is still reviewing the intake details before assignment.',
    publicStatus: 'inReview',
    publicStatusLabel: 'Under review',
    publicStatusDetail:
      'Your request is being reviewed so we can confirm the right fulfillment path and next update.',
    ...override,
  }
}

function buildRequestDetail(
  override: Partial<OpsRequestDetailResponse> = {},
): OpsRequestDetailResponse {
  return {
    publicId: 'hrx_ops_1',
    issueTypeId: 'slow-drain',
    issueLabel: 'Slow drain',
    createdAt: '2026-04-20T13:00:00.000Z',
    serviceLocation: {
      addressLine1: '15 Spring Street',
      city: 'New York',
      postalCode: '10011',
      unitOrAccessNote: 'Buzz unit 2B',
      locationDetails: 'Bathroom sink on the second floor',
    },
    classification: {
      issueTypeId: 'slow-drain',
      serviceabilityStatus: 'serviceable',
      nextStep: 'continueToContainment',
      summaryHeadline: 'This request can keep moving through the guided flow.',
      summaryDetail:
        'You are still within the supported plumbing scope and service area for the next Handrix step.',
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
    serviceability: {
      serviceabilityStatus: 'serviceable',
      serviceabilityLabel: 'Serviceable',
      classificationHeadline: 'This request can keep moving through the guided flow.',
      classificationDetail:
        'You are still within the supported plumbing scope and service area for the next Handrix step.',
      scopeDecisionLabel: 'Within supported plumbing scope',
      scopeDecisionDetail:
        'The intake answers still match the supported single-drain slowdown path for the MVP.',
      coverageDecisionLabel: 'Inside active service area',
      coverageDecisionDetail:
        'ZIP code 10011 is inside the current Handrix service area.',
      dispatchReadiness: 'readyForAssignment',
      dispatchReadinessLabel: 'Reviewing for assignment',
      dispatchReadinessDetail:
        'The request is active and being reviewed for the next dispatch decision.',
    },
    intakeAnswers: [
      {
        questionId: 'singleDrainAffected',
        questionLabel: 'Is only one drain running slowly?',
        answerValue: true,
        answerLabel: 'Yes',
      },
    ],
    customerContext: {
      containmentGuidance: {
        issueTypeId: 'slow-drain',
        serviceabilityStatus: 'serviceable',
        nextStep: 'continueToContainment',
        variant: 'informational',
        headline: 'Keep the drain contained while we prepare the next step.',
        intro: 'A contained drain issue is usually manageable for the moment.',
        steps: [
          {
            title: 'Stop using the fixture for now',
            detail: 'Pause water use while the request moves forward.',
          },
        ],
        warnings: [],
        reassurance: 'You are taking the right first step.',
        nextActionLabel: 'Continue to request review',
        nextActionHint:
          'Next, we will summarize timing, pricing expectations, and your request details.',
      },
      requestReviewSummary: {
        issueTypeId: 'slow-drain',
        issueLabel: 'Slow drain',
        headline: 'Review the request details before you confirm.',
        intro: 'This is a quick final check of what we will submit.',
        sections: [
          {
            title: 'Issue details',
            editTarget: 'issueDetails',
            editLabel: 'Edit issue details',
            items: [{ label: 'Selected issue', value: 'Slow drain' }],
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
          bullets: ['Operations reviews the request and confirms the best fulfillment path.'],
        },
        confirmationLabel: 'Confirm request',
        confirmationHint:
          'You can still go back to edit the details above before you confirm.',
      },
    },
    assignment: {
      currentAssignment: null,
      availableOwners: [
        {
          ownerType: 'provider',
          ownerTypeLabel: 'Provider',
          ownerId: 'provider_northstar',
          ownerLabel: 'Northstar Plumbing Co.',
          description: 'Primary plumbing partner for central neighborhoods.',
        },
        {
          ownerType: 'internalOwner',
          ownerTypeLabel: 'Internal owner',
          ownerId: 'internal_dispatch_desk',
          ownerLabel: 'Handrix Dispatch Desk',
          description: 'Internal fallback owner for manual coordination.',
        },
      ],
      canAssign: false,
      assignmentBlockedReason:
        'Complete the intake review first so the request is ready for assignment.',
    },
    intervention: null,
    availableTransitions: [
      buildTransitionOption({}),
      buildTransitionOption({
        nextLifecycleState: 'clarification_needed',
        actionLabel: 'Request clarification',
        actionDetail:
          'Pause normal fulfillment progress until the missing operational detail is confirmed.',
        nextLifecycleStateLabel: 'Clarification needed',
        nextLifecycleStateDetail:
          'The request needs additional detail before fulfillment can continue.',
        publicStatus: 'needsClarification',
        publicStatusLabel: 'More details needed',
        publicStatusDetail:
          'We need one more clarification before this request can keep moving, and we will guide you through the next step clearly.',
      }),
    ],
    history: [
      {
        previousLifecycleState: null,
        nextLifecycleState: 'intake_in_review',
        previousPublicStatus: null,
        nextPublicStatus: 'received',
        occurredAt: '2026-04-20T13:00:00.000Z',
        actorType: 'customer',
        changeSummary:
          'Customer confirmed the anonymous request through the guided review flow.',
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
    ],
    ...override,
  }
}

describe('OpsRequestDetailScreen', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  const session = {
    accessToken: 'signed.internal.token',
    tokenType: 'Bearer' as const,
    issuedAt: '2026-04-20T12:00:00.000Z',
    expiresAt: '2026-04-20T18:00:00.000Z',
    user: {
      id: 'ops-default-user',
      email: 'ops@handrix.local',
      displayName: 'Operations Coordinator',
      role: 'ops' as const,
    },
  }

  it('loads protected request details and renders only the backend-approved next lifecycle actions', async () => {
    vi.spyOn(opsAuthApi, 'loadOpsProtectedSession').mockResolvedValue({
      scope: 'ops',
      message: 'Operations access granted.',
      user: session.user,
    })
    vi.spyOn(opsRequestDetailApi, 'loadOpsRequestDetail').mockResolvedValue(
      buildRequestDetail(),
    )

    render(
      <OpsRequestDetailScreen
        publicId="hrx_ops_1"
        session={session}
        onBack={() => undefined}
        onLogout={() => undefined}
        onSessionExpired={() => undefined}
      />,
    )

    expect(await screen.findByText(/operations request detail/i)).toBeInTheDocument()
    expect(screen.getByText(/reviewing for assignment/i)).toBeInTheDocument()
    expect(screen.getByText(/buzz unit 2b/i)).toBeInTheDocument()
    expect(screen.getByText(/what the customer has already seen/i)).toBeInTheDocument()
    expect(screen.getByText(/allowed next updates/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /mark ready for assignment/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /request clarification/i })).toBeEnabled()
    expect(screen.queryByRole('button', { name: /mark completed/i })).not.toBeInTheDocument()
  })

  it('shows backend-owned scope and coverage rationale in the serviceability panel', async () => {
    vi.spyOn(opsAuthApi, 'loadOpsProtectedSession').mockResolvedValue({
      scope: 'ops',
      message: 'Operations access granted.',
      user: session.user,
    })
    vi.spyOn(opsRequestDetailApi, 'loadOpsRequestDetail').mockResolvedValue(
      buildRequestDetail(),
    )

    render(
      <OpsRequestDetailScreen
        publicId="hrx_ops_1"
        session={session}
        onBack={() => undefined}
        onLogout={() => undefined}
        onSessionExpired={() => undefined}
      />,
    )

    expect(
      await screen.findByText('Within supported plumbing scope'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'The intake answers still match the supported single-drain slowdown path for the MVP.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Inside active service area')).toBeInTheDocument()
    expect(
      screen.getByText(
        'ZIP code 10011 is inside the current Handrix service area.',
      ),
    ).toBeInTheDocument()
  })

  it('renders intervention context when the request needs clarification', async () => {
    vi.spyOn(opsAuthApi, 'loadOpsProtectedSession').mockResolvedValue({
      scope: 'ops',
      message: 'Operations access granted.',
      user: session.user,
    })
    vi.spyOn(opsRequestDetailApi, 'loadOpsRequestDetail').mockResolvedValue(
      buildRequestDetail({
        currentState: {
          lifecycleState: 'clarification_needed',
          lifecycleStateLabel: 'Clarification needed',
          lifecycleStateDetail:
            'The request needs additional detail before fulfillment can continue.',
          publicStatus: 'needsClarification',
          publicStatusLabel: 'More details needed',
          publicStatusDetail:
            'We need one more clarification before this request can keep moving, and we will guide you through the next step clearly.',
        },
        serviceability: {
          serviceabilityStatus: 'serviceable',
          serviceabilityLabel: 'Serviceable',
          classificationHeadline: 'This request can keep moving through the guided flow.',
          classificationDetail:
            'You are still within the supported plumbing scope and service area for the next Handrix step.',
          scopeDecisionLabel: 'Within supported plumbing scope',
          scopeDecisionDetail:
            'The intake answers still match the supported single-drain slowdown path for the MVP.',
          coverageDecisionLabel: 'Inside active service area',
          coverageDecisionDetail:
            'ZIP code 10011 is inside the current Handrix service area.',
          dispatchReadiness: 'needsClarification',
          dispatchReadinessLabel: 'Needs clarification',
          dispatchReadinessDetail:
            'More customer detail is required before assignment can proceed.',
        },
        intervention: {
          kind: 'clarification',
          label: 'Clarification needed',
          detail: 'The coordinator needs one more customer detail before dispatch.',
          recommendedAction:
            'Confirm the missing detail, then return the request to review or resume dispatch.',
          customerImpact:
            'We still need one more detail before this request can move forward, and we will keep the next step clear.',
          latestRelevantChange: {
            occurredAt: '2026-04-20T13:10:00.000Z',
            actorType: 'ops',
            changeSummary:
              'The coordinator needs one more customer detail before dispatch.',
          },
        },
        history: [
          {
            previousLifecycleState: null,
            nextLifecycleState: 'clarification_needed',
            previousPublicStatus: null,
            nextPublicStatus: 'needsClarification',
            occurredAt: '2026-04-20T13:10:00.000Z',
            actorType: 'ops',
            changeSummary:
              'The coordinator needs one more customer detail before dispatch.',
            intervention: {
              kind: 'clarification',
              label: 'Clarification needed',
              detail:
                'The coordinator needs one more customer detail before dispatch.',
            },
            customerSnapshot: {
              publicStatus: 'needsClarification',
              publicStatusLabel: 'More details needed',
              publicStatusDetail:
                'We need one more clarification before this request can keep moving, and we will guide you through the next step clearly.',
              nextStepDetail:
                'We still need one more detail before this request can move forward, and we will keep the next step clear.',
              recoveryState: {
                kind: 'clarification',
                title: 'We need one more detail',
                detail:
                  'A small clarification is still needed before the request can keep moving.',
                expectationUpdate:
                  'The request stays active while Handrix confirms the missing detail.',
                nextActionLabel: 'Share the missing detail',
                nextActionDetail:
                  'Reply with the requested detail so the request can continue.',
              },
            },
          },
        ],
      }),
    )

    render(
      <OpsRequestDetailScreen
        publicId="hrx_ops_1"
        session={session}
        onBack={() => undefined}
        onLogout={() => undefined}
        onSessionExpired={() => undefined}
      />,
    )

    expect(await screen.findByText(/intervention context/i)).toBeInTheDocument()
    expect(screen.getByText(/recommended next step/i)).toBeInTheDocument()
    expect(
      screen.getAllByText(/the coordinator needs one more customer detail before dispatch/i)
        .length,
    ).toBeGreaterThan(0)
  })

  it('submits an assignment and updates the detail view with the selected owner', async () => {
    vi.spyOn(opsAuthApi, 'loadOpsProtectedSession').mockResolvedValue({
      scope: 'ops',
      message: 'Operations access granted.',
      user: session.user,
    })
    vi.spyOn(opsRequestDetailApi, 'loadOpsRequestDetail').mockResolvedValue(
      buildRequestDetail({
        currentState: {
          lifecycleState: 'intake_in_review',
          lifecycleStateLabel: 'Intake in review',
          lifecycleStateDetail:
            'Operations is still reviewing the intake details before assignment.',
          publicStatus: 'inReview',
          publicStatusLabel: 'Under review',
          publicStatusDetail:
            'Your request is being reviewed so we can confirm the right fulfillment path and next update.',
        },
        assignment: {
          currentAssignment: null,
          availableOwners: [
            {
              ownerType: 'provider',
              ownerTypeLabel: 'Provider',
              ownerId: 'provider_northstar',
              ownerLabel: 'Northstar Plumbing Co.',
              description: 'Primary plumbing partner for central neighborhoods.',
            },
          ],
          canAssign: true,
          assignmentBlockedReason: null,
        },
        availableTransitions: [
          buildTransitionOption({
            nextLifecycleState: 'clarification_needed',
            actionLabel: 'Request clarification',
            actionDetail:
              'Pause normal fulfillment progress until the missing operational detail is confirmed.',
            nextLifecycleStateLabel: 'Clarification needed',
            nextLifecycleStateDetail:
              'The request needs additional detail before fulfillment can continue.',
            publicStatus: 'needsClarification',
            publicStatusLabel: 'More details needed',
            publicStatusDetail:
              'We need one more clarification before this request can keep moving, and we will guide you through the next step clearly.',
          }),
        ],
      }),
    )

    const assignRequestSpy = vi
      .spyOn(opsRequestDetailApi, 'assignOpsRequest')
      .mockResolvedValue(
        buildRequestDetail({
          currentState: {
            lifecycleState: 'dispatch_in_progress',
            lifecycleStateLabel: 'Dispatch in progress',
            lifecycleStateDetail:
              'The request is moving through dispatch after review.',
            publicStatus: 'dispatching',
            publicStatusLabel: 'Dispatch in progress',
            publicStatusDetail:
              'Handrix is coordinating the active fulfillment step for this request.',
          },
          serviceability: {
            serviceabilityStatus: 'serviceable',
            serviceabilityLabel: 'Serviceable',
            classificationHeadline: 'This request can keep moving through the guided flow.',
            classificationDetail:
              'You are still within the supported plumbing scope and service area for the next Handrix step.',
            scopeDecisionLabel: 'Within supported plumbing scope',
            scopeDecisionDetail:
              'The intake answers still match the supported single-drain slowdown path for the MVP.',
            coverageDecisionLabel: 'Inside active service area',
            coverageDecisionDetail:
              'ZIP code 10011 is inside the current Handrix service area.',
            dispatchReadiness: 'dispatchInProgress',
            dispatchReadinessLabel: 'Dispatch in progress',
            dispatchReadinessDetail:
              'A fulfillment path is already active and should stay aligned with customer updates.',
          },
          assignment: {
            currentAssignment: {
              ownerType: 'provider',
              ownerTypeLabel: 'Provider',
              ownerId: 'provider_northstar',
              ownerLabel: 'Northstar Plumbing Co.',
              assignedAt: '2026-04-20T13:10:00.000Z',
              note: 'Closest partner for this ZIP code.',
            },
            availableOwners: [
              {
                ownerType: 'provider',
                ownerTypeLabel: 'Provider',
                ownerId: 'provider_northstar',
                ownerLabel: 'Northstar Plumbing Co.',
                description: 'Primary plumbing partner for central neighborhoods.',
              },
            ],
            canAssign: false,
            assignmentBlockedReason:
              'This request already has an active fulfillment owner.',
          },
          availableTransitions: [
            buildTransitionOption({
              nextLifecycleState: 'dispatch_delayed',
              actionLabel: 'Mark delayed',
              actionDetail:
                'Record that the request is still active but the expected progress timing has changed.',
              nextLifecycleStateLabel: 'Dispatch delayed',
              nextLifecycleStateDetail:
                'A blocker is slowing fulfillment and may require intervention.',
              publicStatus: 'delayed',
              publicStatusLabel: 'Dispatch delayed',
              publicStatusDetail:
                'This request is still active, but the expected progress timing has changed and the next update should explain the revised expectation clearly.',
            }),
          ],
          history: [
            {
              previousLifecycleState: 'intake_in_review',
              nextLifecycleState: 'dispatch_in_progress',
              previousPublicStatus: 'inReview',
              nextPublicStatus: 'dispatching',
              occurredAt: '2026-04-20T13:10:00.000Z',
              actorType: 'ops',
              actorId: 'ops-default-user',
              changeSummary:
                'Operations assigned Northstar Plumbing Co. and moved the request into dispatch.',
              customerSnapshot: {
                publicStatus: 'dispatching',
                publicStatusLabel: 'Dispatch in progress',
                publicStatusDetail:
                  'Handrix is coordinating the active fulfillment step for this request.',
                nextStepDetail:
                  'Handrix will share the next dispatch update as the request moves forward.',
                recoveryState: null,
              },
            },
          ],
        }),
      )

    render(
      <OpsRequestDetailScreen
        publicId="hrx_ops_1"
        session={session}
        onBack={() => undefined}
        onLogout={() => undefined}
        onSessionExpired={() => undefined}
      />,
    )

    fireEvent.change(await screen.findByLabelText(/fulfillment owner/i), {
      target: { value: 'provider_northstar' },
    })
    fireEvent.change(screen.getByLabelText(/assignment note/i), {
      target: { value: 'Closest partner for this ZIP code.' },
    })
    fireEvent.click(screen.getByRole('button', { name: /assign fulfillment owner/i }))

    expect(assignRequestSpy).toHaveBeenCalledWith(
      'signed.internal.token',
      'hrx_ops_1',
      {
        ownerId: 'provider_northstar',
        note: 'Closest partner for this ZIP code.',
      },
      expect.any(AbortSignal),
    )
    expect(await screen.findByText(/northstar plumbing co\./i)).toBeInTheDocument()
    expect(
      screen.getByText(/assignment recorded and dispatch is now in progress\./i),
    ).toBeInTheDocument()
  })

  it('submits a guarded lifecycle update and refreshes the detail view from the backend response', async () => {
    vi.spyOn(opsAuthApi, 'loadOpsProtectedSession').mockResolvedValue({
      scope: 'ops',
      message: 'Operations access granted.',
      user: session.user,
    })
    vi.spyOn(opsRequestDetailApi, 'loadOpsRequestDetail').mockResolvedValue(
      buildRequestDetail(),
    )
    const updateStatusSpy = vi
      .spyOn(opsRequestDetailApi, 'updateOpsRequestStatus')
      .mockResolvedValue(
        buildRequestDetail({
          currentState: {
            lifecycleState: 'intake_in_review',
            lifecycleStateLabel: 'Intake in review',
            lifecycleStateDetail:
              'Operations is still reviewing the intake details before assignment.',
            publicStatus: 'inReview',
            publicStatusLabel: 'Under review',
            publicStatusDetail:
              'Your request is being reviewed so we can confirm the right fulfillment path and next update.',
          },
          assignment: {
            currentAssignment: null,
            availableOwners: [
              {
                ownerType: 'provider',
                ownerTypeLabel: 'Provider',
                ownerId: 'provider_northstar',
                ownerLabel: 'Northstar Plumbing Co.',
                description: 'Primary plumbing partner for central neighborhoods.',
              },
            ],
            canAssign: true,
            assignmentBlockedReason: null,
          },
          availableTransitions: [
            buildTransitionOption({
              nextLifecycleState: 'clarification_needed',
              actionLabel: 'Request clarification',
              actionDetail:
                'Pause normal fulfillment progress until the missing operational detail is confirmed.',
              nextLifecycleStateLabel: 'Clarification needed',
              nextLifecycleStateDetail:
                'The request needs additional detail before fulfillment can continue.',
              publicStatus: 'needsClarification',
              publicStatusLabel: 'More details needed',
              publicStatusDetail:
                'We need one more clarification before this request can keep moving, and we will guide you through the next step clearly.',
            }),
            buildTransitionOption({
              nextLifecycleState: 'dispatch_delayed',
              actionLabel: 'Mark delayed',
              actionDetail:
                'Record that the request is still active but the expected progress timing has changed.',
              nextLifecycleStateLabel: 'Dispatch delayed',
              nextLifecycleStateDetail:
                'A blocker is slowing fulfillment and may require intervention.',
              publicStatus: 'delayed',
              publicStatusLabel: 'Dispatch delayed',
              publicStatusDetail:
                'This request is still active, but the expected progress timing has changed and the next update should explain the revised expectation clearly.',
            }),
          ],
          history: [
            {
              previousLifecycleState: null,
              nextLifecycleState: 'intake_in_review',
              previousPublicStatus: null,
              nextPublicStatus: 'received',
              occurredAt: '2026-04-20T13:00:00.000Z',
              actorType: 'customer',
              changeSummary:
                'Customer confirmed the anonymous request through the guided review flow.',
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
              nextLifecycleState: 'intake_in_review',
              previousPublicStatus: 'received',
              nextPublicStatus: 'inReview',
              occurredAt: '2026-04-20T13:08:00.000Z',
              actorType: 'ops',
              actorId: 'ops-default-user',
              changeSummary:
                'Operations completed the intake review and marked the request ready for assignment.',
              customerSnapshot: {
                publicStatus: 'inReview',
                publicStatusLabel: 'Under review',
                publicStatusDetail:
                  'Your request is being reviewed so we can confirm the right fulfillment path and next update.',
                nextStepDetail:
                  'Handrix is reviewing your request details and service location before the next update.',
                recoveryState: null,
              },
            },
          ],
        }),
      )

    render(
      <OpsRequestDetailScreen
        publicId="hrx_ops_1"
        session={session}
        onBack={() => undefined}
        onLogout={() => undefined}
        onSessionExpired={() => undefined}
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: /mark ready for assignment/i }))

    expect(updateStatusSpy).toHaveBeenCalledWith(
      'signed.internal.token',
      'hrx_ops_1',
      {
        nextLifecycleState: 'intake_in_review',
      },
      expect.any(AbortSignal),
    )
    expect(await screen.findByText(/lifecycle update recorded and the request detail is now aligned\./i)).toBeInTheDocument()
    expect(screen.getAllByText('Customer status:')[0]?.parentElement).toHaveTextContent(
      /under review/i,
    )
    expect(screen.getByRole('button', { name: /assign fulfillment owner/i })).toBeEnabled()
  })

  it('shows a recoverable not-found state and allows returning to the queue', async () => {
    const onBack = vi.fn()

    vi.spyOn(opsAuthApi, 'loadOpsProtectedSession').mockResolvedValue({
      scope: 'ops',
      message: 'Operations access granted.',
      user: session.user,
    })
    vi.spyOn(opsRequestDetailApi, 'loadOpsRequestDetail').mockRejectedValue(
      new opsRequestDetailApi.OpsRequestDetailError(
        'We could not open that operations request right now.',
        'Return to the queue and choose an active request again.',
        'OPS_REQUEST_NOT_FOUND',
      ),
    )

    render(
      <OpsRequestDetailScreen
        publicId="hrx_missing"
        session={session}
        onBack={onBack}
        onLogout={() => undefined}
        onSessionExpired={() => undefined}
      />,
    )

    expect(
      await screen.findByText(/we could not open that operations request right now/i),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /back to queue/i }))

    expect(onBack).toHaveBeenCalledTimes(1)
  })
})
