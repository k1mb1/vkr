import type { NavigationMenuItem } from '@nuxt/ui'
import { getSubjectsPage } from '#hey-api'

export function useSubjectNavigation() {
  const teacherId = useTeacherId()
  const route = useRoute()

  const { request, toPageState } = usePagable({
    pageSize: 100,
    filter: computed(() => ({ teacherId: teacherId.value })),
  })

  const { data } = useApi(
    { key: computed(() => `subject-nav:${teacherId.value}`), watch: [request] },
    () => teacherId.value ? getSubjectsPage({ query: request.value }) : Promise.resolve({ data: null }),
  )

  const { rows: subjects } = toPageState(data)

  const children = computed<NavigationMenuItem[]>(() =>
    subjects.value.map(s => ({
      label: s.name,
      to: `/dashboard/subjects/${s.id}`,
      active: route.path.startsWith(`/dashboard/subjects/${s.id}`),
    })),
  )

  return { subjects, children }
}
