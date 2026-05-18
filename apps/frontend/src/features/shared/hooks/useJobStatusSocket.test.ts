import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';

// ---- Socket.IO mock ----
// vi.mock is hoisted — factory must not reference outer-scope variables
vi.mock('socket.io-client', () => {
  const emitFn = vi.fn();
  const onFn = vi.fn();
  const disconnectFn = vi.fn();
  const socket = { emit: emitFn, on: onFn, disconnect: disconnectFn };
  return { io: vi.fn().mockReturnValue(socket) };
});

// ---- Auth-storage mock ----
vi.mock('../../customer-auth/lib/auth-storage', () => ({
  getAccessToken: vi.fn().mockReturnValue('mock-token'),
  clearAccessToken: vi.fn(),
}));

// ---- Contracts mock: factory is self-contained (vi.mock is hoisted) ----
vi.mock('@handrix/contracts', () => {
  const validStatuses = new Set(['PENDING', 'ASSIGNED', 'ON_THE_WAY', 'ARRIVED', 'WORKING', 'COMPLETE', 'REJECTED']);
  return {
    JobStatusUpdatedEventSchema: {
      safeParse(data: unknown): { success: boolean; data?: { requestId: string; status: string } } {
        if (
          data !== null &&
          typeof data === 'object' &&
          typeof (data as Record<string, unknown>)['requestId'] === 'string' &&
          typeof (data as Record<string, unknown>)['status'] === 'string' &&
          validStatuses.has((data as Record<string, unknown>)['status'] as string)
        ) {
          return { success: true, data: data as { requestId: string; status: string } };
        }
        return { success: false };
      },
    },
  };
});

import { io } from 'socket.io-client';
import { useJobStatusSocket } from './useJobStatusSocket';

function getSocket() {
  // Grab the socket that io() returned on the most recent call
  const ioMock = io as ReturnType<typeof vi.fn>;
  return ioMock.mock.results[ioMock.mock.results.length - 1]?.value as {
    emit: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  };
}

function wrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useJobStatusSocket', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.clearAllMocks();
    // Restore io mock to return a fresh socket object each test
    const freshSocket = {
      emit: vi.fn(),
      on: vi.fn(),
      disconnect: vi.fn(),
    };
    (io as ReturnType<typeof vi.fn>).mockReturnValue(freshSocket);
  });

  it('connects to /realtime with auth token when requestId is provided', () => {
    renderHook(
      () => useJobStatusSocket({ requestId: 'req-1', trackingQueryKey: ['request-tracking', 'req-1'] }),
      { wrapper: wrapper(queryClient) },
    );

    expect(io).toHaveBeenCalledWith('/realtime', expect.objectContaining({
      auth: { token: 'mock-token' },
      transports: ['websocket'],
    }));
  });

  it('does not connect when requestId is empty', () => {
    renderHook(
      () => useJobStatusSocket({ requestId: '', trackingQueryKey: ['request-tracking', ''] }),
      { wrapper: wrapper(queryClient) },
    );

    expect(io).not.toHaveBeenCalled();
  });

  it('registers connect, request.status.updated, reconnect, and disconnect event handlers', () => {
    renderHook(
      () => useJobStatusSocket({ requestId: 'req-1', trackingQueryKey: ['request-tracking', 'req-1'] }),
      { wrapper: wrapper(queryClient) },
    );

    const socket = getSocket();
    const registeredEvents = socket.on.mock.calls.map((call: unknown[]) => call[0]);
    expect(registeredEvents).toContain('connect');
    expect(registeredEvents).toContain('request.status.updated');
    expect(registeredEvents).toContain('reconnect');
    expect(registeredEvents).toContain('disconnect');
  });

  it('emits join-room on connect with the correct requestId', () => {
    renderHook(
      () => useJobStatusSocket({ requestId: 'req-abc', trackingQueryKey: ['request-tracking', 'req-abc'] }),
      { wrapper: wrapper(queryClient) },
    );

    const socket = getSocket();
    const connectCall = socket.on.mock.calls.find((c: unknown[]) => c[0] === 'connect');
    expect(connectCall).toBeDefined();
    (connectCall![1] as () => void)();

    expect(socket.emit).toHaveBeenCalledWith('join-room', { requestId: 'req-abc' });
  });

  it('updates query cache in-place when a valid status event arrives', () => {
    queryClient.setQueryData(['request-tracking', 'req-1'], { requestId: 'req-1', status: 'ASSIGNED', title: 'Fix sink' });

    renderHook(
      () => useJobStatusSocket({ requestId: 'req-1', trackingQueryKey: ['request-tracking', 'req-1'] }),
      { wrapper: wrapper(queryClient) },
    );

    const socket = getSocket();
    const statusHandler = socket.on.mock.calls.find((c: unknown[]) => c[0] === 'request.status.updated');
    expect(statusHandler).toBeDefined();
    (statusHandler![1] as (d: unknown) => void)({ requestId: 'req-1', status: 'ON_THE_WAY' });

    const cached = queryClient.getQueryData<{ status: string }>(['request-tracking', 'req-1']);
    expect(cached?.status).toBe('ON_THE_WAY');
  });

  it('ignores status events for a different requestId', () => {
    queryClient.setQueryData(['request-tracking', 'req-1'], { requestId: 'req-1', status: 'ASSIGNED' });

    renderHook(
      () => useJobStatusSocket({ requestId: 'req-1', trackingQueryKey: ['request-tracking', 'req-1'] }),
      { wrapper: wrapper(queryClient) },
    );

    const socket = getSocket();
    const statusHandler = socket.on.mock.calls.find((c: unknown[]) => c[0] === 'request.status.updated');
    (statusHandler![1] as (d: unknown) => void)({ requestId: 'req-other', status: 'COMPLETE' });

    const cached = queryClient.getQueryData<{ status: string }>(['request-tracking', 'req-1']);
    expect(cached?.status).toBe('ASSIGNED'); // unchanged
  });

  it('disconnects and emits leave-room on unmount', () => {
    const { unmount } = renderHook(
      () => useJobStatusSocket({ requestId: 'req-1', trackingQueryKey: ['request-tracking', 'req-1'] }),
      { wrapper: wrapper(queryClient) },
    );

    const socket = getSocket();
    unmount();

    expect(socket.emit).toHaveBeenCalledWith('leave-room', { requestId: 'req-1' });
    expect(socket.disconnect).toHaveBeenCalled();
  });

  it('clears token when server disconnects the socket', async () => {
    const { clearAccessToken } = await import('../../customer-auth/lib/auth-storage');

    renderHook(
      () => useJobStatusSocket({ requestId: 'req-1', trackingQueryKey: ['request-tracking', 'req-1'] }),
      { wrapper: wrapper(queryClient) },
    );

    const socket = getSocket();
    const disconnectHandler = socket.on.mock.calls.find((c: unknown[]) => c[0] === 'disconnect');
    (disconnectHandler![1] as (reason: string) => void)('io server disconnect');

    expect(clearAccessToken).toHaveBeenCalled();
  });
});
