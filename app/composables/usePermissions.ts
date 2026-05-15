import type { components } from '#open-fetch-schemas/backend'

type TeacherSubjectPermissionResponse = components['schemas']['TeacherSubjectPermissionResponse']

export function usePermissions(subjectId: string, teacherId: string) {
  const permissions = useState<TeacherSubjectPermissionResponse[]>(`subject-permissions-${subjectId}`, () => [])

  const { $backend } = useNuxtApp()

  async function fetchPermissions() {
    if (permissions.value)
      return
    permissions.value = await $backend(`/api/teacher-subject-permissions`, {
      method: 'GET',
      query: {
        subjectId,
        teacherId,
      },
    })
  }

  return {
    permissions,
    fetchPermissions,
  }
}
