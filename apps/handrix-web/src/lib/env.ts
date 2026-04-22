type WebEnvName = 'development' | 'staging' | 'production'

export type WebEnv = {
  apiBaseUrl: string
  environment: WebEnvName
}

function normalizeHttpUrl(rawValue: string, label: string): string {
  let parsedUrl: URL

  try {
    parsedUrl = new URL(rawValue)
  } catch {
    throw new Error(`Invalid ${label} value: ${rawValue}`)
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error(`Invalid ${label} value: ${rawValue}`)
  }

  const normalizedPathname =
    parsedUrl.pathname === '/'
      ? ''
      : parsedUrl.pathname.replace(/\/+$/, '')

  return `${parsedUrl.origin}${normalizedPathname}${parsedUrl.search}${parsedUrl.hash}`
}

function parseWebEnvName(rawValue: string | undefined): WebEnvName {
  const normalizedValue = rawValue?.trim()

  if (
    normalizedValue === 'development' ||
    normalizedValue === 'staging' ||
    normalizedValue === 'production'
  ) {
    return normalizedValue
  }

  if (!normalizedValue) {
    throw new Error('Missing required VITE_HANDRIX_ENV value.')
  }

  throw new Error(`Invalid VITE_HANDRIX_ENV value: ${normalizedValue}`)
}

function parseRequiredUrl(rawValue: string | undefined, label: string): string {
  const normalizedValue = rawValue?.trim()

  if (!normalizedValue) {
    throw new Error(`Missing required ${label} value.`)
  }

  return normalizeHttpUrl(normalizedValue, label)
}

export function parseWebEnv(
  env: Record<string, string | undefined> = import.meta.env,
): WebEnv {
  return {
    apiBaseUrl: parseRequiredUrl(env.VITE_API_BASE_URL, 'VITE_API_BASE_URL'),
    environment: parseWebEnvName(env.VITE_HANDRIX_ENV),
  }
}

const webEnv = parseWebEnv()

export function getApiBaseUrl(): string {
  return webEnv.apiBaseUrl
}

export function getWebEnvironment(): WebEnvName {
  return webEnv.environment
}
