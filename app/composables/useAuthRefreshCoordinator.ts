function sanitizeRedirectTarget(input: string | null | undefined): string {
  if (!input || !input.startsWith('/') || input.startsWith('//')) {
    return '/dashboard'
  }

  return input
}

let refreshPromise: Promise<boolean> | null = null
let loginNavigationPromise: Promise<void> | null = null

export async function redirectToLoginPreservingPath(from?: string | null) {
  if (import.meta.server) {
    return
  }

  if (loginNavigationPromise) {
    return loginNavigationPromise
  }

  const { toLoginPath } = useOidcAuth()
  const target = sanitizeRedirectTarget(from)

  loginNavigationPromise = (async () => {
    await navigateTo(toLoginPath(target))
  })()

  try {
    await loginNavigationPromise
  } finally {
    loginNavigationPromise = null
  }
}

export async function refreshSessionSingleFlight(from?: string | null): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise
  }

  const { refreshNow, fetch } = useOidcAuth()

  refreshPromise = (async () => {
    try {
      await refreshNow()
      await fetch()
      return true
    } catch {
      await redirectToLoginPreservingPath(from)
      return false
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}
