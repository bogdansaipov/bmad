import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SupportRequestDetailResponse } from '@handrix/shared-contracts'
import * as supportAuthApi from './support-auth-api'
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
    latestChangeSummary:
      'Customer confirmed the anonymous request through the guided review flow.',
    currentAssignmentOwnerLabel: null,
    interventionLabel: null,
    lastUpdatedAt: '2026-04-20T13:05:00.000Z',
  }

  it('renders the detail payload after verification', async () => {
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
    expect(screen.getByText(/intake in review/i)).toBeInTheDocument()
    expect(screen.getByText(/request received/i)).toBeInTheDocument()
    expect(
      screen.getByText(
        /customer confirmed the anonymous request through the guided review flow/i,
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/no fulfillment owner assigned yet/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        /full request history and prior customer guidance arrive in the next support story/i,
      ),
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
