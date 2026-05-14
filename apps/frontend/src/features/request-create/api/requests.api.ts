import {
  CreateRequestResponseSchema,
  PricingEstimateSchema,
  type CreateRequestBody,
  type CreateRequestResponse,
  type PricingEstimate,
} from '@handrix/contracts';
import { clearAccessToken, getAccessToken } from '../../customer-auth/lib/auth-storage';
import { AuthError } from './categories.api';

export async function fetchPricingEstimate(categoryId: string): Promise<PricingEstimate> {
  const token = getAccessToken();
  if (!token) {
    clearAccessToken();
    throw new AuthError();
  }

  let res: Response;
  try {
    res = await fetch(`/api/pricing/estimate?categoryId=${encodeURIComponent(categoryId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw Object.assign(new Error('Network error. Check your connection and try again.'), {
      status: 0,
    });
  }

  if (res.status === 401) {
    clearAccessToken();
    throw new AuthError();
  }

  if (!res.ok) {
    throw Object.assign(new Error('Failed to load pricing estimate.'), { status: res.status });
  }

  const body = await res.json().catch(() => null);
  const parsed = PricingEstimateSchema.safeParse(body);
  if (!parsed.success) {
    console.error('fetchPricingEstimate: response failed schema validation', parsed.error.issues);
    throw Object.assign(new Error('Server returned an unexpected response.'), {
      status: res.status,
    });
  }

  return parsed.data;
}

export async function submitCreateRequest(body: CreateRequestBody): Promise<CreateRequestResponse> {
  const token = getAccessToken();
  if (!token) {
    clearAccessToken();
    throw new AuthError();
  }

  let res: Response;
  try {
    res = await fetch('/api/requests', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw Object.assign(new Error('Network error. Check your connection and try again.'), {
      status: 0,
    });
  }

  if (res.status === 401) {
    clearAccessToken();
    throw new AuthError();
  }

  if (!res.ok) {
    const responseBody = await res.json().catch(() => null);
    const message =
      (responseBody as { message?: string })?.message ?? 'Failed to submit request.';
    throw Object.assign(new Error(message), { status: res.status });
  }

  const responseBody = await res.json().catch(() => null);
  const parsed = CreateRequestResponseSchema.safeParse(responseBody);
  if (!parsed.success) {
    console.error('submitCreateRequest: response failed schema validation', parsed.error.issues);
    throw Object.assign(new Error('Server returned an unexpected response.'), {
      status: res.status,
    });
  }

  return parsed.data;
}
