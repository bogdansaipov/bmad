import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as opsAuthApi from './ops-auth-api'
import * as opsQueueApi from './ops-queue-api'
import { OpsQueueScreen } from './ops-queue-screen'

describe('OpsQueueScreen', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
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

  it('loads and renders the live queue after verifying the protected session', async () => {
    vi.spyOn(opsAuthApi, 'loadOpsProtectedSession').mockResolvedValue({
      scope: 'ops',
      message: 'Operations access granted.',
      user: session.user,
    })
    vi.spyOn(opsQueueApi, 'loadOpsQueue').mockResolvedValue({
      items: [
        {
          publicId: 'hrx_ops_1',
          issueLabel: 'Slow drain',
          addressSummary: '15 Spring Street, New York',
          queueState: 'new',
          queueStateLabel: 'New request',
          queueStateDetail: 'Needs first-pass operations review.',
          urgencyCue: 'New intake',
          assignmentStatus: 'unassigned',
          assignmentStatusLabel: 'Unassigned',
          intervention: {
            kind: 'clarification',
            label: 'Clarification needed',
            detail: 'The coordinator needs one more customer detail before dispatch.',
            recommendedAction:
              'Confirm the missing detail, then return the request to review or resume dispatch.',
            customerImpact:
              'We still need one more detail before this request can move forward, and we will keep the next step clear.',
            latestRelevantChange: {
              occurredAt: '2026-04-20T13:05:00.000Z',
              actorType: 'ops',
              changeSummary:
                'The coordinator needs one more customer detail before dispatch.',
            },
          },
          receivedAt: '2026-04-20T13:00:00.000Z',
          updatedAt: '2026-04-20T13:05:00.000Z',
          latestChangeSummary:
            'Customer confirmed the anonymous request through the guided review flow.',
        },
      ],
      summary: {
        totalActive: 1,
        needsAttentionCount: 1,
        assignedCount: 0,
        blockedCount: 0,
        unavailableCount: 0,
      },
      refreshedAt: '2026-04-20T13:05:00.000Z',
    })

    render(
      <OpsQueueScreen
        session={session}
        onOpenRequest={() => undefined}
        onLogout={() => undefined}
        onSessionExpired={() => undefined}
      />,
    )

    expect(screen.getByText(/verifying your operations session/i)).toBeInTheDocument()
    expect(await screen.findByText(/slow drain/i)).toBeInTheDocument()
    expect(screen.getByText(/new request/i)).toBeInTheDocument()
    expect(screen.getByText(/unassigned/i)).toBeInTheDocument()
    expect(screen.getByText(/clarification needed/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/operations queue summary/i)).toHaveTextContent('1')
  })

  it('shows an empty state when there are no active requests', async () => {
    vi.spyOn(opsAuthApi, 'loadOpsProtectedSession').mockResolvedValue({
      scope: 'ops',
      message: 'Operations access granted.',
      user: session.user,
    })
    vi.spyOn(opsQueueApi, 'loadOpsQueue').mockResolvedValue({
      items: [],
      summary: {
        totalActive: 0,
        needsAttentionCount: 0,
        assignedCount: 0,
        blockedCount: 0,
        unavailableCount: 0,
      },
      refreshedAt: '2026-04-20T13:05:00.000Z',
    })

    render(
      <OpsQueueScreen
        session={session}
        onOpenRequest={() => undefined}
        onLogout={() => undefined}
        onSessionExpired={() => undefined}
      />,
    )

    expect(
      await screen.findByText(/no active requests need operations attention right now/i),
    ).toBeInTheDocument()
  })

  it('keeps the last queue snapshot visible while a refresh fails', async () => {
    vi.spyOn(opsAuthApi, 'loadOpsProtectedSession').mockResolvedValue({
      scope: 'ops',
      message: 'Operations access granted.',
      user: session.user,
    })

    let refreshCallback: (() => void) | null = null
    vi.spyOn(window, 'setInterval').mockImplementation((handler) => {
      if (typeof handler === 'function') {
        refreshCallback = handler as () => void
      }

      return 1 as unknown as ReturnType<typeof window.setInterval>
    })
    vi.spyOn(window, 'clearInterval').mockImplementation(() => undefined)

    const queueSpy = vi
      .spyOn(opsQueueApi, 'loadOpsQueue')
      .mockResolvedValueOnce({
        items: [
          {
            publicId: 'hrx_ops_1',
            issueLabel: 'Slow drain',
            addressSummary: '15 Spring Street, New York',
            queueState: 'new',
            queueStateLabel: 'New request',
            queueStateDetail: 'Needs first-pass operations review.',
            urgencyCue: 'New intake',
            assignmentStatus: 'unassigned',
            assignmentStatusLabel: 'Unassigned',
            intervention: null,
            receivedAt: '2026-04-20T13:00:00.000Z',
            updatedAt: '2026-04-20T13:05:00.000Z',
            latestChangeSummary:
              'Customer confirmed the anonymous request through the guided review flow.',
          },
        ],
        summary: {
          totalActive: 1,
          needsAttentionCount: 1,
          assignedCount: 0,
          blockedCount: 0,
          unavailableCount: 0,
        },
        refreshedAt: '2026-04-20T13:05:00.000Z',
      })
      .mockRejectedValueOnce(new Error('temporary failure'))

    render(
      <OpsQueueScreen
        session={session}
        onOpenRequest={() => undefined}
        onLogout={() => undefined}
        onSessionExpired={() => undefined}
      />,
    )

    expect(await screen.findByText(/slow drain/i)).toBeInTheDocument()
    expect(refreshCallback).not.toBeNull()

    await act(async () => {
      refreshCallback?.()
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        /we could not load the live operations queue right now/i,
      )
    })

    expect(screen.getByText(/slow drain/i)).toBeInTheDocument()
    expect(queueSpy).toHaveBeenCalledTimes(2)
  })

  it('opens the selected request detail from the queue item action', async () => {
    const onOpenRequest = vi.fn()

    vi.spyOn(opsAuthApi, 'loadOpsProtectedSession').mockResolvedValue({
      scope: 'ops',
      message: 'Operations access granted.',
      user: session.user,
    })
    vi.spyOn(opsQueueApi, 'loadOpsQueue').mockResolvedValue({
      items: [
        {
          publicId: 'hrx_ops_1',
          issueLabel: 'Slow drain',
          addressSummary: '15 Spring Street, New York',
          queueState: 'new',
          queueStateLabel: 'New request',
          queueStateDetail: 'Needs first-pass operations review.',
          urgencyCue: 'New intake',
          assignmentStatus: 'unassigned',
          assignmentStatusLabel: 'Unassigned',
          intervention: null,
          receivedAt: '2026-04-20T13:00:00.000Z',
          updatedAt: '2026-04-20T13:05:00.000Z',
          latestChangeSummary:
            'Customer confirmed the anonymous request through the guided review flow.',
        },
      ],
      summary: {
        totalActive: 1,
        needsAttentionCount: 1,
        assignedCount: 0,
        blockedCount: 0,
        unavailableCount: 0,
      },
      refreshedAt: '2026-04-20T13:05:00.000Z',
    })

    render(
      <OpsQueueScreen
        session={session}
        onOpenRequest={onOpenRequest}
        onLogout={() => undefined}
        onSessionExpired={() => undefined}
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: /open request detail/i }))

    expect(onOpenRequest).toHaveBeenCalledWith('hrx_ops_1')
  })
})
