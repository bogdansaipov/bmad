import {
  HandymanJobHistoryResponseSchema,
  type HandymanJobHistoryResponse,
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

export async function fetchHandymanHistory(): Promise<HandymanJobHistoryResponse> {
  const token = requireToken();
  const res = await fetch('/api/jobs/history', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401) {
    clearAccessToken();
    throw new AuthError();
  }
  if (!res.ok) {
    throw new Error('Failed to load job history.');
  }

  const data = await res.json();
  const parsed = HandymanJobHistoryResponseSchema.safeParse(data);
  if (!parsed.success) {
    console.error('HandymanJobHistoryResponseSchema parse error', parsed.error);
    return [];
  }
  return parsed.data;
}
