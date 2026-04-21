export type SupportRoute =
  | '/support/login'
  | '/support/workspace'
  | `/support/requests/${string}`

export function isSupportPath(pathname: string) {
  return (
    pathname === '/support/login' ||
    pathname === '/support/workspace' ||
    pathname.startsWith('/support/requests/')
  )
}

export function getSupportRoute(pathname: string): SupportRoute {
  if (pathname === '/support/workspace') {
    return '/support/workspace'
  }

  if (pathname.startsWith('/support/requests/')) {
    return pathname as `/support/requests/${string}`
  }

  return '/support/login'
}

export function getSupportRequestPublicId(pathname: string) {
  if (!pathname.startsWith('/support/requests/')) {
    return null
  }

  const publicId = pathname.replace('/support/requests/', '').trim()
  return publicId.length > 0 ? decodeURIComponent(publicId) : null
}
