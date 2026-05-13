import {
  ImageUploadResponseSchema,
  type ImageUploadResponse,
} from '@handrix/contracts';
import { getAccessToken, clearAccessToken } from '../../customer-auth/lib/auth-storage';
import { AuthError } from './categories.api';

export async function uploadRequestImage(file: File): Promise<ImageUploadResponse> {
  const token = getAccessToken();
  if (!token) {
    clearAccessToken();
    throw new AuthError();
  }

  const form = new FormData();
  form.append('file', file);

  let res: Response;
  try {
    res = await fetch('/api/uploads/request-image', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      // Do NOT set Content-Type — browser sets it with boundary for multipart/form-data
      body: form,
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
    const body = await res.json().catch(() => null);
    const message = (body as { message?: string })?.message ?? 'Failed to upload image.';
    throw Object.assign(new Error(message), { status: res.status });
  }

  const body = await res.json().catch(() => null);
  const parsed = ImageUploadResponseSchema.safeParse(body);
  if (!parsed.success) {
    console.error('uploadRequestImage: response failed schema validation', parsed.error.issues);
    throw Object.assign(new Error('Server returned an unexpected response.'), {
      status: res.status,
    });
  }

  return parsed.data;
}
