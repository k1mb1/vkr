import { useTeachersApi } from '~/composables/api/useTeachersApi'

type ApiErrorPayload = {
  message?: string
  statusMessage?: string
}

type ApiError = {
  data?: ApiErrorPayload
  message?: string
}

function isDashboardPath(path: string): boolean {
  return path === '/dashboard' || path.startsWith('/dashboard/')
}

function buildFallbackUsername(email: string): string {
  return email.split('@')[0] || 'teacher'
}

export default defineNuxtPlugin(() => {
  const router = useRouter()
  const route = useRoute()
  const { user, loggedIn } = useOidcAuth()
  const { createOrUpdate } = useTeachersApi()

  const syncedUserSub = useState<string | null>('teacher-sync-user-sub', () => null)
  const syncInFlight = useState<boolean>('teacher-sync-in-flight', () => false)
  const teacherSyncError = useState<string | null>('teacher-sync-error', () => null)

  async function runTeacherSyncIfNeeded(path: string) {
    if (!isDashboardPath(path) || !loggedIn.value || syncInFlight.value) {
      return
    }

    const teacherId = user.value?.sub
    const email = user.value?.email
    const username = user.value?.name || (email ? buildFallbackUsername(email) : undefined)

    if (!teacherId || !email || !username) {
      return
    }

    if (syncedUserSub.value === teacherId) {
      return
    }

    syncInFlight.value = true
    teacherSyncError.value = null

    try {
      const request = await createOrUpdate(teacherId, {
        username,
        email
      })

      if (request.error.value) {
        throw request.error.value
      }

      syncedUserSub.value = teacherId
    } catch (error: unknown) {
      const apiError = error as ApiError
      teacherSyncError.value = apiError.data?.message || apiError.data?.statusMessage || apiError.message || 'Teacher sync failed'
      console.warn('[teacher-sync] createOrUpdate failed', {
        teacherId,
        error: teacherSyncError.value
      })
    } finally {
      syncInFlight.value = false
    }
  }

  router.afterEach((to) => {
    void runTeacherSyncIfNeeded(to.path)
  })

  void runTeacherSyncIfNeeded(route.path)
})
