export type OpsRoute = '/ops/login' | '/ops/queue' | `/ops/requests/${string}`

export function isOpsPath(pathname: string) {
  return pathname === '/ops/login' || pathname === '/ops/queue' || pathname.startsWith('/ops/requests/')
}

export function getOpsRoute(pathname: string): OpsRoute {
  if (pathname === '/ops/queue') {
    return '/ops/queue'
  }

  if (pathname.startsWith('/ops/requests/')) {
    return pathname as `/ops/requests/${string}`
  }

  return '/ops/login'
}

export function getOpsRequestPublicId(pathname: string) {
  if (!pathname.startsWith('/ops/requests/')) {
    return null
  }

  const publicId = pathname.replace('/ops/requests/', '').trim()
  return publicId.length > 0 ? decodeURIComponent(publicId) : null
}
