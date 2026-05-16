import type { User } from '#auth-utils'
import type { components } from '#open-fetch-schemas/backend'

type TeacherSubjectPermissionResponse = components['schemas']['TeacherSubjectPermissionResponse']

export function usePermissions() {
  const route = useRoute()
  const { user } = useOidcAuth()

  const subjectId = computed(() => String(route.params.uuid ?? ''))
  const teacherId = computed(() => (user.value as User | null)?.sub ?? '')

  const { data, pending, error, refresh } = useBackend('/api/teacher-subject-permissions/single', {
    method: 'GET',
    key: computed(() => `my-permission:${subjectId.value}:${teacherId.value}`),
    query: computed(() => ({
      subjectId: subjectId.value,
      teacherId: teacherId.value,
    })),
  })

  const permission = computed<TeacherSubjectPermissionResponse | null>(() => data.value ?? null)

  return {
    permission,
    pending,
    error,
    refresh,
  }
}
