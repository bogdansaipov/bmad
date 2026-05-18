import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { JobStatusUpdatedEventSchema } from '@handrix/contracts';
import { clearAccessToken, getAccessToken } from '../../customer-auth/lib/auth-storage';

interface UseJobStatusSocketOptions {
  requestId: string;
  trackingQueryKey: unknown[];
}

export function useJobStatusSocket({ requestId, trackingQueryKey }: UseJobStatusSocketOptions): void {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!requestId) return;

    const token = getAccessToken();
    if (!token) return;

    const socket = io('/realtime', {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10_000,
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-room', { requestId });
    });

    socket.on('request.status.updated', (data: unknown) => {
      const parsed = JobStatusUpdatedEventSchema.safeParse(data);
      if (!parsed.success || parsed.data.requestId !== requestId) return;

      // Update TanStack Query cache in-place — no refetch, no loading flash
      queryClient.setQueryData(trackingQueryKey, (old: Record<string, unknown> | undefined) => {
        if (!old) return old;
        return { ...old, status: parsed.data.status };
      });
    });

    socket.on('reconnect', () => {
      // On reconnect: refetch from server to catch any missed events
      void queryClient.invalidateQueries({ queryKey: trackingQueryKey });
    });

    socket.on('disconnect', (reason) => {
      if (reason === 'io server disconnect') {
        // Server kicked us (auth expired). Clear token.
        clearAccessToken();
      }
    });

    return () => {
      socket.emit('leave-room', { requestId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [requestId, queryClient]); // eslint-disable-line react-hooks/exhaustive-deps
}
