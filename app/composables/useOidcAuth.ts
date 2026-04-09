export function useOidcAuth() {
  const { loggedIn, user, session, fetch, clear } = useUserSession()

  function login(target?: string | null) {
    const redirect = (typeof target === 'string' && target.length > 0) ? target : '/dashboard'
    const redirectQuery = encodeURIComponent(redirect)

    return navigateTo(`/auth/oidc?redirect=${redirectQuery}`, {
      external: true
    })
  }

  function toLoginPath(target?: string | null) {
    const redirect = (typeof target === 'string' && target.length > 0) ? target : '/dashboard'
    return `/auth/login?redirect=${encodeURIComponent(redirect)}`
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    await clear()
    await navigateTo('/logout')
  }

  async function refreshNow() {
    return $fetch('/api/auth/refresh', { method: 'POST' })
  }

  return {
    loggedIn,
    user,
    session,
    fetch,
    login,
    toLoginPath,
    logout,
    refreshNow
  }
}
