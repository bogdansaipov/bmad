import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SupportRequestSearchResponse } from '@handrix/shared-contracts'
import * as supportAuthApi from './support-auth-api'
import * as supportSearchApi from './support-search-api'
import { SupportWorkspaceScreen } from './support-workspace-screen'

describe('SupportWorkspaceScreen', () => {
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

  function mockProtectedSessionOk() {
    vi.spyOn(supportAuthApi, 'loadSupportProtectedSession').mockResolvedValue(
      protectedSession,
    )
  }

  const searchResponse: SupportRequestSearchResponse = {
    items: [
      {
        publicId: 'hrx_abc',
        issueLabel: 'Slow drain',
        addressSummary: '15 Spring Street, New York',
        currentPublicStatusLabel: 'Request received',
        currentPublicStatusDetail:
          'Our team is reviewing your issue details and service location so we can confirm the best next step.',
        currentInternalLifecycleLabel: 'Intake in review',
        currentInternalLifecycleDetail:
          'Operations is still reviewing the intake details before assignment.',
        receivedAt: '2026-04-20T13:00:00.000Z',
        lastUpdatedAt: '2026-04-20T13:05:00.000Z',
        latestChangeSummary:
          'Customer confirmed the anonymous request through the guided review flow.',
        currentAssignmentOwnerLabel: null,
        interventionLabel: null,
      },
    ],
    summary: { totalMatched: 1, limitReached: false },
    refreshedAt: '2026-04-21T12:00:00.000Z',
    query: { q: 'spring', normalizedQ: 'spring', limit: 25 },
  }

  it('renders the search form once the protected session is verified', async () => {
    mockProtectedSessionOk()

    render(
      <SupportWorkspaceScreen
        session={session}
        onLogout={() => undefined}
        onOpenRequest={() => undefined}
        onSessionExpired={() => undefined}
      />,
    )

    expect(
      await screen.findByRole('button', { name: /search requests/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('searchbox', { name: /search support requests/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/start by entering something you know/i),
    ).toBeInTheDocument()
  })

  it('submits a query and renders matching results', async () => {
    mockProtectedSessionOk()
    const searchSpy = vi
      .spyOn(supportSearchApi, 'searchSupportRequests')
      .mockResolvedValue(searchResponse)

    render(
      <SupportWorkspaceScreen
        session={session}
        onLogout={() => undefined}
        onOpenRequest={() => undefined}
        onSessionExpired={() => undefined}
      />,
    )

    const input = await screen.findByRole('searchbox', {
      name: /search support requests/i,
    })
    fireEvent.change(input, { target: { value: 'spring' } })
    fireEvent.click(screen.getByRole('button', { name: /search requests/i }))

    expect(
      await screen.findByRole('heading', { name: /slow drain/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/15 spring street, new york/i)).toBeInTheDocument()
    expect(screen.getAllByText(/intake in review/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/request received/i).length).toBeGreaterThan(0)
    expect(
      screen.getByText(
        /customer confirmed the anonymous request through the guided review flow/i,
      ),
    ).toBeInTheDocument()
    expect(searchSpy).toHaveBeenCalledWith(session.accessToken, {
      q: 'spring',
      limit: 25,
    })
  })

  it('renders the calm no-matches card when the search returns zero items', async () => {
    mockProtectedSessionOk()
    vi.spyOn(supportSearchApi, 'searchSupportRequests').mockResolvedValue({
      ...searchResponse,
      items: [],
      summary: { totalMatched: 0, limitReached: false },
      query: { q: 'nothing', normalizedQ: 'nothing', limit: 25 },
    })

    render(
      <SupportWorkspaceScreen
        session={session}
        onLogout={() => undefined}
        onOpenRequest={() => undefined}
        onSessionExpired={() => undefined}
      />,
    )

    const input = await screen.findByRole('searchbox', {
      name: /search support requests/i,
    })
    fireEvent.change(input, { target: { value: 'nothing' } })
    fireEvent.click(screen.getByRole('button', { name: /search requests/i }))

    expect(
      await screen.findByRole('heading', {
        name: /we could not find a request matching that search/i,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/try a different request id, address, or issue label/i),
    ).toBeInTheDocument()
  })

  it('renders the calm ops-alert with message and recovery hint on a non-auth error', async () => {
    mockProtectedSessionOk()
    vi.spyOn(supportSearchApi, 'searchSupportRequests').mockRejectedValue(
      new supportAuthApi.SupportAuthError(
        'Search is briefly unavailable.',
        'Try again in a moment.',
        'SUPPORT_SEARCH_UNAVAILABLE',
      ),
    )

    render(
      <SupportWorkspaceScreen
        session={session}
        onLogout={() => undefined}
        onOpenRequest={() => undefined}
        onSessionExpired={() => undefined}
      />,
    )

    const input = await screen.findByRole('searchbox', {
      name: /search support requests/i,
    })
    fireEvent.change(input, { target: { value: 'spring' } })
    fireEvent.click(screen.getByRole('button', { name: /search requests/i }))

    expect(
      await screen.findByText(/search is briefly unavailable/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/try again in a moment/i)).toBeInTheDocument()
  })

  it('calls onSessionExpired when the search call returns INTERNAL_AUTH_FORBIDDEN', async () => {
    mockProtectedSessionOk()
    vi.spyOn(supportSearchApi, 'searchSupportRequests').mockRejectedValue(
      new supportAuthApi.SupportAuthError(
        'This account does not have support access.',
        'Use an authorized staff account for this protected route.',
        'INTERNAL_AUTH_FORBIDDEN',
      ),
    )
    const onSessionExpired = vi.fn()

    render(
      <SupportWorkspaceScreen
        session={session}
        onLogout={() => undefined}
        onOpenRequest={() => undefined}
        onSessionExpired={onSessionExpired}
      />,
    )

    const input = await screen.findByRole('searchbox', {
      name: /search support requests/i,
    })
    fireEvent.change(input, { target: { value: 'spring' } })
    fireEvent.click(screen.getByRole('button', { name: /search requests/i }))

    await waitFor(() => {
      expect(onSessionExpired).toHaveBeenCalledWith({
        message: 'This account does not have support access.',
        recoveryHint:
          'Use an authorized staff account for this protected route.',
      })
    })
  })

  it('invokes onOpenRequest with the matched publicId when Open request is clicked', async () => {
    mockProtectedSessionOk()
    vi.spyOn(supportSearchApi, 'searchSupportRequests').mockResolvedValue(
      searchResponse,
    )
    const onOpenRequest = vi.fn()

    render(
      <SupportWorkspaceScreen
        session={session}
        onLogout={() => undefined}
        onOpenRequest={onOpenRequest}
        onSessionExpired={() => undefined}
      />,
    )

    const input = await screen.findByRole('searchbox', {
      name: /search support requests/i,
    })
    fireEvent.change(input, { target: { value: 'spring' } })
    fireEvent.click(screen.getByRole('button', { name: /search requests/i }))

    const openButton = await screen.findByRole('button', {
      name: /open request/i,
    })
    fireEvent.click(openButton)

    expect(onOpenRequest).toHaveBeenCalledWith('hrx_abc')
  })

  it('calls onSessionExpired with the protected-session error when the role is rejected', async () => {
    vi.spyOn(supportAuthApi, 'loadSupportProtectedSession').mockRejectedValue(
      new supportAuthApi.SupportAuthError(
        'This account does not have support access.',
        'Use an authorized staff account for this protected route.',
        'INTERNAL_AUTH_FORBIDDEN',
      ),
    )
    const onSessionExpired = vi.fn()

    render(
      <SupportWorkspaceScreen
        session={session}
        onLogout={() => undefined}
        onOpenRequest={() => undefined}
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

  it('shows a calm error banner when the verification call fails for a non-auth reason', async () => {
    vi.spyOn(supportAuthApi, 'loadSupportProtectedSession').mockRejectedValue(
      new Error('network boom'),
    )

    render(
      <SupportWorkspaceScreen
        session={session}
        onLogout={() => undefined}
        onOpenRequest={() => undefined}
        onSessionExpired={() => undefined}
      />,
    )

    expect(
      await screen.findByText(
        /we could not verify that protected session right now/i,
      ),
    ).toBeInTheDocument()
  })
})
