export const ACCESS_TOKEN_KEY = 'handrix_access_token';

export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAccessToken(token: string): void {
  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } catch {
    // Safari private mode / quota exceeded — caller handles this
    throw new Error(
      'Your browser blocked saving your session. Disable private browsing or free up storage and try again.',
    );
  }
}

export function clearAccessToken(): void {
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch {
    // swallow — best effort clear
  }
}
