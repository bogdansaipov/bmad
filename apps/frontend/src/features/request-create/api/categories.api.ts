import {
  CategoryListResponseSchema,
  type CategoryListResponse,
} from '@handrix/contracts';
import { getAccessToken, clearAccessToken } from '../../customer-auth/lib/auth-storage';

export class AuthError extends Error {
  readonly status = 401;
  constructor() {
    super('Authentication required');
    this.name = 'AuthError';
  }
}

export async function fetchCategories(): Promise<CategoryListResponse> {
  const token = getAccessToken();
  if (!token) {
    clearAccessToken();
    throw new AuthError();
  }

  let res: Response;
  try {
    res = await fetch('/api/categories', {
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
    throw Object.assign(new Error('Failed to load categories.'), { status: res.status });
  }

  const body = await res.json().catch(() => null);
  const parsed = CategoryListResponseSchema.safeParse(body);
  if (!parsed.success) {
    console.error('fetchCategories: response failed schema validation', parsed.error.issues);
    throw Object.assign(new Error('Server returned an unexpected response.'), {
      status: res.status,
    });
  }

  return parsed.data;
}
