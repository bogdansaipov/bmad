import { RequestTrackingResponseSchema, type RequestTrackingResponse } from '@handrix/contracts';
import { getAccessToken, clearAccessToken } from '../../customer-auth/lib/auth-storage';
import { AuthError } from '../../customer-dashboard/api/requests.api';

export async function fetchRequestTracking(requestId: string): Promise<RequestTrackingResponse> {
  const token = getAccessToken();
  if (!token) {
    clearAccessToken();
    throw new AuthError();
  }

  const res = await fetch(`/api/requests/${requestId}/tracking`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401) {
    clearAccessToken();
    throw new AuthError();
  }

  if (!res.ok) {
    throw Object.assign(new Error('Failed to load tracking info.'), { status: res.status });
  }

  const body = await res.json().catch(() => null);
  const parsed = RequestTrackingResponseSchema.safeParse(body);
  if (!parsed.success) {
    console.error('fetchRequestTracking: schema validation failed', parsed.error.issues);
    throw Object.assign(new Error('Server returned an unexpected response.'), { status: res.status });
  }

  return parsed.data;
}
