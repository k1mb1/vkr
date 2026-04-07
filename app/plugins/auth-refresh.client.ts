export default defineNuxtPlugin(() => {
  const route = useRoute()
  const { loggedIn, tokenExpiresAt, refreshNow } = useOidcAuth()

  let timer: ReturnType<typeof setTimeout> | undefined

  const scheduleRefresh = () => {
    if (timer) {
      clearTimeout(timer)
      timer = undefined
    }

    if (!loggedIn.value || !tokenExpiresAt.value) {
      return
    }

    const msUntilRefresh = Math.max(tokenExpiresAt.value - Date.now() - 60_000, 10_000)

    timer = setTimeout(async () => {
      try {
        await refreshNow()
      } catch {
        if (!route.path.startsWith('/auth/')) {
          await navigateTo('/auth/login?reason=refresh_failed')
        }
      } finally {
        scheduleRefresh()
      }
    }, msUntilRefresh)
  }

  watch([loggedIn, tokenExpiresAt], scheduleRefresh, { immediate: true })

  if (import.meta.client) {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        scheduleRefresh()
      }
    })
  }
})
