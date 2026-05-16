import type { components } from '#open-fetch-schemas/backend'
import type { MaybeRefOrGetter } from 'vue'

type TeacherSubjectPermissionResponse = components['schemas']['TeacherSubjectPermissionResponse']

export function usePermissions(
  subjectId: MaybeRefOrGetter<string>,
  teacherId: MaybeRefOrGetter<string>,
) {
  const { data, pending, error, refresh } = useBackend('/api/teacher-subject-permissions', {
    method: 'GET',
    query: computed(() => ({
      subjectId: toValue(subjectId),
      teacherId: toValue(teacherId),
    })),
  })

  const permissions = computed<TeacherSubjectPermissionResponse[]>(() => data.value ?? [])

  function findById(id: string) {
    return permissions.value.find(p => p.id === id)
  }

  return {
    permissions,
    pending,
    error,
    refresh,
    findById,
  }
}
