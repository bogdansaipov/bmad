import {
  ActiveJobResponse,
  ActiveJobResponseSchema,
  PostLocationResponse,
  PostLocationResponseSchema,
  UpdateJobStatusResponse,
  UpdateJobStatusResponseSchema,
} from '@handrix/contracts';
import { clearAccessToken, getAccessToken } from '../../customer-auth/lib/auth-storage';
import { AuthError } from '../../handyman-dashboard/api/handyman-profile.api';

function requireToken(): string {
  const token = getAccessToken();
  if (!token) { clearAccessToken(); throw new AuthError(); }
  return token;
}

async function jsonRequest(input: RequestInfo, init: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch {
    throw Object.assign(new Error('Network error. Check your connection and try again.'), { status: 0 });
  }
}

export async function fetchActiveJob(requestId: string): Promise<ActiveJobResponse> {
  const token = requireToken();
  const res = await jsonRequest(`/api/jobs/active/${requestId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) { clearAccessToken(); throw new AuthError(); }
  if (!res.ok) throw Object.assign(new Error('Failed to load active job.'), { status: res.status });
  const body = await res.json().catch(() => null);
  const parsed = ActiveJobResponseSchema.safeParse(body);
  if (!parsed.success) {
    console.error('fetchActiveJob: schema validation failed', parsed.error.issues);
    throw Object.assign(new Error('Server returned an unexpected response.'), { status: res.status });
  }
  return parsed.data;
}

export async function updateJobStatus(requestId: string, status: string): Promise<UpdateJobStatusResponse> {
  const token = requireToken();
  const res = await jsonRequest(`/api/jobs/active/${requestId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (res.status === 401) { clearAccessToken(); throw new AuthError(); }
  if (!res.ok) throw Object.assign(new Error('Failed to update job status.'), { status: res.status });
  const body = await res.json().catch(() => null);
  const parsed = UpdateJobStatusResponseSchema.safeParse(body);
  if (!parsed.success) {
    console.error('updateJobStatus: schema validation failed', parsed.error.issues);
    throw Object.assign(new Error('Server returned an unexpected response.'), { status: res.status });
  }
  return parsed.data;
}

export async function postLocation(requestId: string, lat: number, lng: number): Promise<PostLocationResponse> {
  const token = requireToken();
  const res = await jsonRequest(`/api/jobs/active/${requestId}/location`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat, lng }),
  });
  if (res.status === 401) { clearAccessToken(); throw new AuthError(); }
  if (!res.ok) throw Object.assign(new Error('Failed to post location.'), { status: res.status });
  const body = await res.json().catch(() => null);
  const parsed = PostLocationResponseSchema.safeParse(body);
  if (!parsed.success) {
    console.error('postLocation: schema validation failed', parsed.error.issues);
    throw Object.assign(new Error('Server returned an unexpected response.'), { status: res.status });
  }
  return parsed.data;
}
