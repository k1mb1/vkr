import type { components } from '#open-fetch-schemas/backend'
import type { NavigationMenuItem } from '@nuxt/ui'

type SubjectResponse = components['schemas']['SubjectResponse']

export function useSubjectNavigation() {
  const { user } = useOidcAuth()

  const teacherId = computed(() => (user.value as { sub?: string }).sub ?? '')

  const { data } = useBackend('/api/subjects', {
    method: 'GET',
    query: { page: 0, size: 100, teacherId },
  })

  const subjects = computed<SubjectResponse[]>(() => data.value?.content ?? [])

  const children = computed<NavigationMenuItem[]>(() =>
    subjects.value.map(s => ({
      label: s.name,
      to: `/dashboard/subjects/${s.id}`,
    })),
  )

  return { subjects, children }
}
