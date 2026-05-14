import {
  CategoryListResponseSchema,
  HandymanProfileSetupResponseSchema,
  type CategoryListResponse,
  type HandymanProfileSetupResponse,
  type UpdateHandymanProfileRequest,
} from '@handrix/contracts';
import { clearAccessToken, getAccessToken } from '../../customer-auth/lib/auth-storage';

export class AuthError extends Error {
  readonly status = 401;
  constructor() {
    super('Authentication required');
    this.name = 'AuthError';
  }
}

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

export async function fetchHandymanProfile(): Promise<HandymanProfileSetupResponse> {
  const token = requireToken();
  const res = await jsonRequest('/api/users/me/handyman-profile', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401) {
    clearAccessToken();
    throw new AuthError();
  }
  if (!res.ok) {
    throw Object.assign(new Error('Failed to load profile.'), { status: res.status });
  }

  const body = await res.json().catch(() => null);
  const parsed = HandymanProfileSetupResponseSchema.safeParse(body);
  if (!parsed.success) {
    console.error('fetchHandymanProfile: schema validation failed', parsed.error.issues);
    throw Object.assign(new Error('Server returned an unexpected response.'), {
      status: res.status,
    });
  }
  return parsed.data;
}

export async function updateHandymanProfile(
  payload: UpdateHandymanProfileRequest,
): Promise<HandymanProfileSetupResponse> {
  const token = requireToken();
  const res = await jsonRequest('/api/users/me/handyman-profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (res.status === 401) {
    clearAccessToken();
    throw new AuthError();
  }
  if (!res.ok) {
    const message =
      res.status === 400
        ? 'Some of your selections are invalid. Refresh and try again.'
        : res.status === 409
          ? 'Another session is editing this profile. Please retry.'
          : 'Failed to save profile. Please try again.';
    throw Object.assign(new Error(message), { status: res.status });
  }

  const body = await res.json().catch(() => null);
  const parsed = HandymanProfileSetupResponseSchema.safeParse(body);
  if (!parsed.success) {
    console.error('updateHandymanProfile: schema validation failed', parsed.error.issues);
    throw Object.assign(new Error('Server returned an unexpected response.'), {
      status: res.status,
    });
  }
  return parsed.data;
}

export async function fetchHandymanCategories(): Promise<CategoryListResponse> {
  const token = requireToken();
  const res = await jsonRequest('/api/categories', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401) {
    clearAccessToken();
    throw new AuthError();
  }
  if (!res.ok) {
    throw Object.assign(new Error('Failed to load categories.'), { status: res.status });
  }

  const body = await res.json().catch(() => null);
  const parsed = CategoryListResponseSchema.safeParse(body);
  if (!parsed.success) {
    console.error('fetchHandymanCategories: schema validation failed', parsed.error.issues);
    throw Object.assign(new Error('Server returned an unexpected response.'), {
      status: res.status,
    });
  }
  return parsed.data;
}
