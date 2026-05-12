import type { User } from '#auth-utils'
import type { components } from '#open-fetch-schemas/backend'
import type { FetchError } from 'ofetch'

type BackendErrorResponse = components['schemas']['Error']

function isDashboardPath(path: string): boolean {
  return path === '/dashboard' || path.startsWith('/dashboard/')
}

function extractErrorMessage(error: unknown): string {
  const fetchError = error as FetchError<BackendErrorResponse>
  return fetchError.data?.message || fetchError.data?.details || fetchError.statusMessage || fetchError.message || 'Teacher sync failed'
}

export default defineNuxtPlugin(() => {
  const { $backend } = useNuxtApp()
  const router = useRouter()
  const route = useRoute()
  const { user, loggedIn } = useOidcAuth()

  const syncedSub = useState<string | null>('teacher-sync-sub', () => null)
  const syncError = useState<string | null>('teacher-sync-error', () => null)
  let inFlight = false

  async function syncIfNeeded(path: string) {
    if (!isDashboardPath(path) || !loggedIn.value || inFlight)
      return

    const { sub: teacherId, email, name } = user.value as User

    if (syncedSub.value === teacherId)
      return

    inFlight = true
    syncError.value = null

    try {
      await $backend('/api/teachers/{id}', {
        method: 'PUT',
        path: { id: teacherId! },
        body: {
          email: email!,
          username: name!,
        },
      })
    }
    catch (error) {
      syncError.value = extractErrorMessage(error)
      console.warn('[teacher-sync] failed', { teacherId, error: syncError.value })
    }
    finally {
      inFlight = false
    }
  }

  function resetSync() {
    syncedSub.value = null
    syncError.value = null
  }

  router.afterEach(to => void syncIfNeeded(to.path))

  watch(loggedIn, (isLoggedIn) => {
    if (!isLoggedIn)
      return resetSync()
    void syncIfNeeded(route.path)
  })

  watch(() => user.value?.sub, (newSub, oldSub) => {
    if (oldSub && newSub !== oldSub)
      resetSync()
    void syncIfNeeded(route.path)
  })

  watch(
    () => [user.value?.email, user.value?.name] as const,
    () => {
      if (!isDashboardPath(route.path))
        return
      resetSync()
      void syncIfNeeded(route.path)
    },
  )

  void syncIfNeeded(route.path)
})
