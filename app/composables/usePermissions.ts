import type { PermissionScopeResponse, TeacherSubjectPermissionResponse } from '#hey-api'
import { getTeacherSubjectPermission } from '#hey-api'

export function usePermissions(subjectIdOverride?: MaybeRefOrGetter<string>) {
  const route = subjectIdOverride ? null : useRoute()

  const subjectId = computed(() =>
    subjectIdOverride
      ? toValue(subjectIdOverride)
      : String(route?.params.uuid ?? ''),
  )

  const teacherId = useTeacherId()

  const { data, status, error, pending, refresh, execute, clear } = useApi(
    {
      key: computed(() => `permission:${subjectId.value}:${teacherId.value}`),
      watch: [subjectId, teacherId],
    },
    () => teacherId.value && subjectId.value
      ? getTeacherSubjectPermission({ query: { subjectId: subjectId.value, teacherId: teacherId.value } })
      : Promise.resolve({ data: null }),
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
