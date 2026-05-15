import {
  AcceptJobResponseSchema,
  DeclineJobResponseSchema,
  type AcceptJobResponse,
  type DeclineJobResponse,
} from '@handrix/contracts';
import { clearAccessToken, getAccessToken } from '../../customer-auth/lib/auth-storage';
import { AuthError } from '../../handyman-dashboard/api/handyman-profile.api';

function requireToken(): string {
  const token = getAccessToken();
  if (!token) {
    clearAccessToken();
    throw new AuthError();
  }
  return token;
}

async function jsonRequest(input: RequestInfo, init: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch {
    throw Object.assign(new Error('Network error. Check your connection and try again.'), {
      status: 0,
    });
  }
}

export async function acceptJob(offerId: string): Promise<AcceptJobResponse> {
  const token = requireToken();
  const res = await jsonRequest(`/api/assignments/${offerId}/accept`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401) {
    clearAccessToken();
    throw new AuthError();
  }
  if (res.status === 404) {
    throw Object.assign(new Error('This job is no longer available.'), { status: 404 });
  }
  if (res.status === 409) {
    throw Object.assign(new Error('This job was just taken by another handyman.'), { status: 409 });
  }
  if (!res.ok) {
    throw Object.assign(new Error('Failed to accept job. Please try again.'), { status: res.status });
  }

  const body = await res.json().catch(() => null);
  const parsed = AcceptJobResponseSchema.safeParse(body);
  if (!parsed.success) {
    console.error('acceptJob: schema validation failed', parsed.error.issues);
    throw Object.assign(new Error('Server returned an unexpected response.'), { status: res.status });
  }
  return parsed.data;
}

export async function declineJob(offerId: string): Promise<DeclineJobResponse> {
  const token = requireToken();
  const res = await jsonRequest(`/api/assignments/${offerId}/decline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401) {
    clearAccessToken();
    throw new AuthError();
  }
  if (res.status === 404 || res.status === 409) {
    throw Object.assign(new Error('This job is no longer available.'), { status: res.status });
  }
  if (!res.ok) {
    throw Object.assign(new Error('Failed to decline job. Please try again.'), { status: res.status });
  }

  const body = await res.json().catch(() => null);
  const parsed = DeclineJobResponseSchema.safeParse(body);
  if (!parsed.success) {
    console.error('declineJob: schema validation failed', parsed.error.issues);
    throw Object.assign(new Error('Server returned an unexpected response.'), { status: res.status });
  }
  return parsed.data;
}
