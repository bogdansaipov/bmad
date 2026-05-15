import {
  HandymanJobFeedResponseSchema,
  type HandymanJobFeedResponse,
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

export async function fetchAvailableJobs(): Promise<HandymanJobFeedResponse> {
  const token = requireToken();
  const res = await jsonRequest('/api/jobs/available', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401) {
    clearAccessToken();
    throw new AuthError();
  }
  if (!res.ok) {
    throw Object.assign(new Error('Failed to load jobs.'), { status: res.status });
  }

  const body = await res.json().catch(() => null);
  const parsed = HandymanJobFeedResponseSchema.safeParse(body);
  if (!parsed.success) {
    console.error('fetchAvailableJobs: schema validation failed', parsed.error.issues);
    throw Object.assign(new Error('Server returned an unexpected response.'), {
      status: res.status,
    });
  }
  return parsed.data;
}
