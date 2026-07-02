import type { NavigationMenuItem } from '@nuxt/ui'
import { getPage } from '#hey-api'

export function useSubjectNavigation() {
  const { user } = useOidcAuth()
  const route = useRoute()

  const teacherId = computed(() => (user.value as { sub?: string }).sub ?? '')

  const { request, toPageState } = usePagable({
    pageSize: 100,
    filter: computed(() => ({ teacherId: teacherId.value })),
  })

  const { data } = useApi({ key: 'subject-nav', watch: [request] }, () => getPage({ query: request.value }))

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
