import type { User } from '#auth-utils'
import type { components } from '#open-fetch-schemas/backend'

type TeacherSubjectPermissionResponse
  = components['schemas']['TeacherSubjectPermissionResponse']
type PermissionScopeResponse
  = components['schemas']['PermissionScopeResponse']

export function usePermissions(subjectIdOverride?: MaybeRefOrGetter<string>) {
  const { user } = useOidcAuth()

  const route = subjectIdOverride ? null : useRoute()

  const subjectId = computed(() =>
    subjectIdOverride
      ? toValue(subjectIdOverride)
      : String(route?.params.uuid ?? ''),
  )

  const teacherId = computed(() => (user.value as User | null)?.sub ?? '')

  const { data, status, error, pending, refresh, execute, clear } = useBackend(
    '/api/teacher-subject-permissions/single',
    {
      method: 'GET',
      key: computed(() => `permission:${subjectId.value}:${teacherId.value}`),
      query: computed(() => ({
        subjectId: subjectId.value,
        teacherId: teacherId.value,
      })),
    },
  )

  const hasAllPermissions = computed<boolean>(
    () => data.value?.allPermissions === true,
  )

  const scopes = computed<PermissionScopeResponse[]>(
    () => data.value?.scopes ?? [],
  )

  const permission = computed<TeacherSubjectPermissionResponse | undefined>(
    () => data.value,
  )

  const permissionId = computed<string>(() => permission.value?.id ?? '')

  return {
    permission,
    permissionId,
    scopes,
    hasAllPermissions,
    status,
    error,
    pending,
    refresh,
    execute,
    clear,
  }
}
