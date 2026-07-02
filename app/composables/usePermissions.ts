import type { User } from '#auth-utils'
import type { PermissionScopeResponse, TeacherSubjectPermissionResponse } from '#hey-api'
import { getPermission } from '#hey-api'

export function usePermissions(subjectIdOverride?: MaybeRefOrGetter<string>) {
  const { user } = useOidcAuth()

  const route = subjectIdOverride ? null : useRoute()

  const subjectId = computed(() =>
    subjectIdOverride
      ? toValue(subjectIdOverride)
      : String(route?.params.uuid ?? ''),
  )

  const teacherId = computed(() => (user.value as User | null)?.sub ?? '')

  const { data, status, error, pending, refresh, execute, clear } = useApi(
    {
      key: `permission:${toValue(subjectId)}`,
      watch: [subjectId, teacherId],
    },
    () => getPermission({ query: { subjectId: subjectId.value, teacherId: teacherId.value } }),
  )

  const hasAllPermissions = computed<boolean>(
    () => data.value?.allPermissions === true,
  )

  const scopes = computed<PermissionScopeResponse[]>(
    () => data.value?.scopes ?? [],
  )

  const permission = computed<TeacherSubjectPermissionResponse | undefined>(
    () => data.value ?? undefined,
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
