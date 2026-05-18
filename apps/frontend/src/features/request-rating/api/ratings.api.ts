import {
  RatingStatusResponse,
  RatingStatusResponseSchema,
  SubmitRatingResponse,
  SubmitRatingResponseSchema,
} from '@handrix/contracts';
import { clearAccessToken, getAccessToken } from '../../customer-auth/lib/auth-storage';
import { AuthError } from '../../customer-dashboard/api/requests.api';

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

export async function submitRating(
  requestId: string,
  stars: number,
  shortFeedback?: string,
): Promise<SubmitRatingResponse> {
  const token = requireToken();
  const res = await jsonRequest('/api/ratings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestId, stars, shortFeedback }),
  });
  if (res.status === 401) { clearAccessToken(); throw new AuthError(); }
  if (!res.ok) throw Object.assign(new Error('Failed to submit rating.'), { status: res.status });
  const body = await res.json().catch(() => null);
  const parsed = SubmitRatingResponseSchema.safeParse(body);
  if (!parsed.success) throw Object.assign(new Error('Unexpected response from server.'), { status: res.status });
  return parsed.data;
}

export async function fetchRatingStatus(requestId: string): Promise<RatingStatusResponse> {
  const token = requireToken();
  const res = await jsonRequest(`/api/ratings/by-request/${requestId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) { clearAccessToken(); throw new AuthError(); }
  if (!res.ok) throw Object.assign(new Error('Failed to load rating status.'), { status: res.status });
  const body = await res.json().catch(() => null);
  const parsed = RatingStatusResponseSchema.safeParse(body);
  if (!parsed.success) throw Object.assign(new Error('Unexpected response from server.'), { status: res.status });
  return parsed.data;
}
