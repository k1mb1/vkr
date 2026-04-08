export default defineNuxtPlugin(() => {
  const route = useRoute()
  const { loggedIn, tokenExpiresAt } = useOidcAuth()

  let timer: ReturnType<typeof setTimeout> | undefined
  let initialRefreshDone = false

  const runRefresh = async (): Promise<boolean> => {
    if (route.path.startsWith('/auth/')) {
      return false
    }

    return refreshSessionSingleFlight(route.fullPath)
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
      } else if (timer) {
        clearTimeout(timer)
        timer = undefined
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
