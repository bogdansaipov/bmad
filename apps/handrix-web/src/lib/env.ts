const DEFAULT_API_BASE_URL = 'http://localhost:3000'

export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL
}
