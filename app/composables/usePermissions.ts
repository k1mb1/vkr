import type { User } from '#auth-utils'
import type { components } from '#open-fetch-schemas/backend'

type TeacherSubjectPermissionResponse
  = components['schemas']['TeacherSubjectPermissionResponse']

type PermissionScopeResponse
  = components['schemas']['PermissionScopeResponse']

export function usePermissions() {
  const route = useRoute()
  const { user } = useOidcAuth()

  const subjectId = computed(() => String(route.params.uuid ?? ''))
  const teacherId = computed(() => (user.value as User | null)?.sub ?? '')

  const { data, pending, error, refresh } = useBackend(
    '/api/teacher-subject-permissions/single',
    {
      method: 'GET',
      key: computed(
        () => `permission:${subjectId.value}:${teacherId.value}`,
      ),
      query: computed(() => ({
        subjectId: subjectId.value,
        teacherId: teacherId.value,
      })),
    },
  )

  const permission = computed<TeacherSubjectPermissionResponse | undefined>(
    () => data.value,
  )

  const permissionId = computed<string>(() => permission.value?.id ?? '')

  const scopes = computed<PermissionScopeResponse[]>(
    () => permission.value?.scopes ?? [],
  )

  const allPermissions = computed<boolean>(
    () => permission.value?.allPermissions ?? false,
  )

  const selectedScopeId = ref<string>('')

  watch(scopes, (list) => {
    if (list.length === 0) {
      selectedScopeId.value = ''
      return
    }
    const exists = list.some(s => s.id === selectedScopeId.value)
    if (!exists)
      selectedScopeId.value = list[0]?.id ?? ''
  }, { immediate: true })

  const scope = computed<PermissionScopeResponse | undefined>(() => {
    if (!selectedScopeId.value)
      return scopes.value[0]
    return scopes.value.find(s => s.id === selectedScopeId.value) ?? scopes.value[0]
  })

  const scopeId = computed<string>(() => scope.value?.id ?? '')

  return {
    permission,
    permissionId,
    scopes,
    scope,
    scopeId,
    selectedScopeId,
    allPermissions,

    pending,
    error,
    refresh,
  }
}
