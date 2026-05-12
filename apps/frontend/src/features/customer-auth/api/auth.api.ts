import {
  LoginResponseSchema,
  RegisterResponseSchema,
  SessionResponseSchema,
  type LoginRequest,
  type LoginResponse,
  type RegisterRequest,
  type RegisterResponse,
  type SessionResponse,
} from '@handrix/contracts';
import { getAccessToken, clearAccessToken } from '../lib/auth-storage';

export async function registerUser(data: RegisterRequest): Promise<RegisterResponse> {
  let res: Response;
  try {
    res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch {
    throw Object.assign(new Error('Network error. Check your connection and try again.'), { status: 0 });
  }

  if (res.status === 409) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw Object.assign(new Error(body.message ?? 'Email already registered'), { status: 409 });
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string | string[] };
    const raw = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    throw Object.assign(new Error(raw ?? 'Registration failed. Please try again.'), { status: res.status });
  }

  const parsed = RegisterResponseSchema.safeParse(await res.json().catch(() => null));
  if (!parsed.success) {
    throw Object.assign(new Error('Server returned an unexpected response. Please try again.'), { status: res.status });
  }
  return parsed.data;
}

export async function loginUser(data: LoginRequest): Promise<LoginResponse> {
  let res: Response;
  try {
    res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch {
    throw Object.assign(new Error('Network error. Check your connection and try again.'), { status: 0 });
  }

  if (res.status === 401) {
    throw Object.assign(new Error('Invalid email or password.'), { status: 401 });
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string | string[] };
    const raw = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    throw Object.assign(new Error(raw ?? 'Login failed. Please try again.'), { status: res.status });
  }

  const parsed = LoginResponseSchema.safeParse(await res.json().catch(() => null));
  if (!parsed.success) {
    throw Object.assign(new Error('Server returned an unexpected response. Please try again.'), { status: res.status });
  }
  return parsed.data;
}

export async function fetchSession(): Promise<SessionResponse | null> {
  const token = getAccessToken();
  if (!token) return null;

  let res: Response;
  try {
    res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw Object.assign(new Error('Network error. Check your connection and try again.'), { status: 0 });
  }

  if (res.status === 401) {
    clearAccessToken();
    return null;
  }

  if (!res.ok) {
    throw Object.assign(new Error('Session check failed.'), { status: res.status });
  }

  const parsed = SessionResponseSchema.safeParse(await res.json().catch(() => null));
  if (!parsed.success) {
    clearAccessToken();
    throw Object.assign(new Error('Server returned an unexpected response.'), { status: res.status });
  }
  return parsed.data;
}
