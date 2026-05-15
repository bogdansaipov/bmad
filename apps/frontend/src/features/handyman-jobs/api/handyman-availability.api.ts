import {
  HandymanProfileSetupResponseSchema,
  UpdateHandymanAvailabilityRequestSchema,
  type HandymanProfileSetupResponse,
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

export async function updateAvailability(
  status: 'online' | 'offline',
): Promise<HandymanProfileSetupResponse> {
  const token = requireToken();
  const body = UpdateHandymanAvailabilityRequestSchema.parse({ availabilityStatus: status });
  const res = await jsonRequest('/api/users/me/handyman-availability', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (res.status === 401) {
    clearAccessToken();
    throw new AuthError();
  }
  if (!res.ok) {
    throw Object.assign(new Error('Failed to update availability.'), { status: res.status });
  }

  const responseBody = await res.json().catch(() => null);
  const parsed = HandymanProfileSetupResponseSchema.safeParse(responseBody);
  if (!parsed.success) {
    console.error('updateAvailability: schema validation failed', parsed.error.issues);
    throw Object.assign(new Error('Server returned an unexpected response.'), {
      status: res.status,
    });
  }
  return parsed.data;
}
