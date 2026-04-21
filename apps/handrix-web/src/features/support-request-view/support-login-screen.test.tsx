import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as supportAuthApi from './support-auth-api'
import { SupportLoginScreen } from './support-login-screen'

describe('SupportLoginScreen', () => {
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

  it('submits credentials and calls onAuthenticated with the returned session', async () => {
    const onAuthenticated = vi.fn()
    vi.spyOn(supportAuthApi, 'createInternalSession').mockResolvedValue(session)

    render(<SupportLoginScreen onAuthenticated={onAuthenticated} />)

    expect(screen.getByRole('heading', { name: /support access/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /enter support workspace/i }))

    await waitFor(() => {
      expect(onAuthenticated).toHaveBeenCalledWith(session)
    })
    expect(supportAuthApi.createInternalSession).toHaveBeenCalledWith({
      email: 'support@handrix.local',
      password: 'support-demo-pass',
    })
  })

  it('renders the calm error message and recovery hint when the API rejects credentials', async () => {
    const onAuthenticated = vi.fn()
    vi.spyOn(supportAuthApi, 'createInternalSession').mockRejectedValue(
      new supportAuthApi.SupportAuthError(
        'Those staff credentials were not accepted.',
        'Use an authorized staff account and try again.',
        'INTERNAL_AUTH_REJECTED',
      ),
    )

    render(<SupportLoginScreen onAuthenticated={onAuthenticated} />)

    fireEvent.click(screen.getByRole('button', { name: /enter support workspace/i }))

    expect(
      await screen.findByText(/those staff credentials were not accepted/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/use an authorized staff account and try again/i),
    ).toBeInTheDocument()
    expect(onAuthenticated).not.toHaveBeenCalled()
  })

  it('disables the submit button while a sign-in attempt is in flight', async () => {
    let resolveFn: (value: typeof session) => void = () => undefined
    vi.spyOn(supportAuthApi, 'createInternalSession').mockImplementation(
      () =>
        new Promise<typeof session>((resolve) => {
          resolveFn = resolve
        }),
    )

    render(<SupportLoginScreen onAuthenticated={() => undefined} />)

    const submitButton = screen.getByRole('button', { name: /enter support workspace/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled()
    })

    resolveFn(session)

    await waitFor(() => {
      expect(supportAuthApi.createInternalSession).toHaveBeenCalled()
    })
  })

  it('renders an initial error message when provided by the parent (e.g., after a 403 redirect)', () => {
    render(
      <SupportLoginScreen
        onAuthenticated={() => undefined}
        initialErrorMessage="This account does not have support access."
        initialRecoveryHint="Use an authorized staff account for this protected route."
      />,
    )

    expect(
      screen.getByText(/this account does not have support access/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/use an authorized staff account for this protected route/i),
    ).toBeInTheDocument()
  })
})
