import { upsertTeacher } from '~/composables/api/useTeachersApi'
import type { BackendErrorResponse, UpdateTeacherRequestPayload } from '#shared/types/backend'
import type { FetchError } from 'ofetch'

function isDashboardPath(path: string): boolean {
  return path === '/dashboard' || path.startsWith('/dashboard/')
}

function buildFallbackUsername(email: string): string {
  return email.split('@')[0] || 'teacher'
}

function extractIdentity(rawUser?: { sub?: string, email?: string, name?: string } | null): { teacherId: string, payload: UpdateTeacherRequestPayload } | null {
  const teacherId = rawUser?.sub
  const email = rawUser?.email
  const username = rawUser?.name || (email ? buildFallbackUsername(email) : undefined)

  if (!teacherId || !email || !username) {
    return null
  }

  return {
    teacherId,
    payload: {
      email,
      username,
    },
  }
}

function extractErrorMessage(error: unknown): string {
  const fetchError = error as FetchError<BackendErrorResponse>
  return fetchError.data?.message || fetchError.data?.details || fetchError.statusMessage || fetchError.message || 'Teacher sync failed'
}

export default defineNuxtPlugin(() => {
  const router = useRouter()
  const route = useRoute()
  const { user, loggedIn } = useOidcAuth()
  const syncedUserSub = useState<string | null>('teacher-sync-user-sub', () => null)
  const syncInFlight = useState<boolean>('teacher-sync-in-flight', () => false)
  const teacherSyncError = useState<string | null>('teacher-sync-error', () => null)
  let latestSyncRunId = 0

  async function runTeacherSyncIfNeeded(path: string) {
    if (!isDashboardPath(path) || !loggedIn.value || syncInFlight.value) {
      return
    }

    const identity = extractIdentity(user.value)
    if (!identity) {
      return
    }

    const { teacherId, payload } = identity

    if (syncedUserSub.value === teacherId) {
      return
    }

    syncInFlight.value = true
    teacherSyncError.value = null
    const syncRunId = ++latestSyncRunId

    try {
      const request = await upsertTeacher(teacherId, payload)

      if (request.error.value) {
        throw request.error.value
      }

      if (syncRunId === latestSyncRunId && user.value?.sub === teacherId) {
        syncedUserSub.value = teacherId
      }
    }
    catch (error: unknown) {
      teacherSyncError.value = extractErrorMessage(error)
      console.warn('[teacher-sync] createOrUpdate failed', {
        teacherId,
        error: teacherSyncError.value,
      })
    }
    finally {
      syncInFlight.value = false
    }
  }

  router.afterEach((to) => {
    void runTeacherSyncIfNeeded(to.path)
  })

  watch(loggedIn, (isLoggedIn) => {
    if (!isLoggedIn) {
      syncedUserSub.value = null
      teacherSyncError.value = null
      return
    }

    void runTeacherSyncIfNeeded(route.path)
  })

  watch(() => user.value?.sub, (newSub, oldSub) => {
    if (oldSub && newSub !== oldSub) {
      syncedUserSub.value = null
      teacherSyncError.value = null
    }

    void runTeacherSyncIfNeeded(route.path)
  })

  watch(() => [user.value?.email, user.value?.name], () => {
    if (isDashboardPath(route.path)) {
      syncedUserSub.value = null
      void runTeacherSyncIfNeeded(route.path)
    }
  })

  void runTeacherSyncIfNeeded(route.path)
})
