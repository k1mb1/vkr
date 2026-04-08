export default defineNuxtPlugin(() => {
  const route = useRoute()
  const { loggedIn, tokenExpiresAt, refreshNow, fetch } = useOidcAuth()

  let timer: ReturnType<typeof setTimeout> | undefined
  let refreshing = false
  let initialRefreshDone = false

  const handleRefreshFailure = () => {
    if (!route.path.startsWith('/auth/')) {
      showError(createError({
        statusCode: 401,
        statusMessage: 'Unauthorized',
        message: 'Your session expired. Please sign in again.',
        fatal: true,
        data: {
          from: route.fullPath
        }
      }))
    }
  }

  const runRefresh = async (): Promise<boolean> => {
    if (refreshing) {
      return true
    }

    refreshing = true
    try {
      await refreshNow()
      await fetch()
      return true
    } catch {
      handleRefreshFailure()
      return false
    } finally {
      refreshing = false
    }
  }

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
      const ok = await runRefresh()
      if (ok) {
        scheduleRefresh()
      }
    }, msUntilRefresh)
  }

  watch([loggedIn, tokenExpiresAt], scheduleRefresh, { immediate: true })

  watch(loggedIn, async (isLoggedIn) => {
    if (!isLoggedIn || initialRefreshDone) {
      return
    }

    initialRefreshDone = true
    const ok = await runRefresh()
    if (ok) {
      scheduleRefresh()
    }
  }, { immediate: true })

  if (import.meta.client) {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        scheduleRefresh()
      }
    })
  }
})
