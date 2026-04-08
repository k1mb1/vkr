export function useOidcAuth() {
  const { loggedIn, user, session, fetch, clear } = useUserSession()

  const tokenExpiresAt = computed(() => session.value?.tokenExpiresAt as number | undefined)
  const expiresInMs = computed(() => {
    if (!tokenExpiresAt.value) {
      return null
    }

    return tokenExpiresAt.value - Date.now()
  })

  function login(target?: string | null) {
    const redirect = (typeof target === 'string' && target.length > 0) ? target : '/dashboard'
    const redirectQuery = encodeURIComponent(redirect)

    return navigateTo(`/auth/oidc?redirect=${redirectQuery}`, {
      external: true
    })
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
    tokenExpiresAt,
    expiresInMs,
    fetch,
    login,
    logout,
    refreshNow
  }
}
