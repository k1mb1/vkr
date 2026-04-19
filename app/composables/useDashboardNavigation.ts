import type { FindSubjectsFilter } from '#shared/types/backend'
import type { NavigationMenuItem } from '@nuxt/ui'
import { useSubjectsApi } from '~/composables/api/useSubjectsApi'

export function useDashboardNavigation() {
  const { user } = useOidcAuth()
  const { findAllByTeacherId } = useSubjectsApi()

  const teacherId = computed(() => {
    const value = user.value?.sub
    return typeof value === 'string' && value.length > 0 ? value : null
  })

  const safeTeacherId = computed(() => teacherId.value ?? '')

  const activeFilter = computed<FindSubjectsFilter>(() => ({ archived: false }))
  const archivedFilter = computed<FindSubjectsFilter>(() => ({ archived: true }))

  const { data: activeSubjectsData, pending: activeSubjectsPending, error: activeSubjectsError, refresh: refreshActiveSubjects } = findAllByTeacherId(safeTeacherId, activeFilter, { immediate: false })
  const { data: archivedSubjectsData, pending: archivedSubjectsPending, error: archivedSubjectsError, refresh: refreshArchivedSubjects } = findAllByTeacherId(safeTeacherId, archivedFilter, { immediate: false })

  watch(teacherId, async (value) => {
    if (!value)
      return
    await Promise.all([refreshActiveSubjects(), refreshArchivedSubjects()])
  }, { immediate: true })

  const subjectChildren = computed<NavigationMenuItem[]>(() => {
    if (!teacherId.value)
      return [{ label: 'Сессия не инициализирована', icon: 'i-lucide-circle-alert', disabled: true }]
    if (activeSubjectsPending.value || archivedSubjectsPending.value)
      return [{ label: 'Загрузка предметов...', icon: 'i-lucide-loader-circle', disabled: true }]
    if (activeSubjectsError.value || archivedSubjectsError.value)
      return [{ label: 'Ошибка загрузки предметов', icon: 'i-lucide-circle-x', disabled: true }]

    const items = [
      ...(activeSubjectsData.value ?? []).map(s => ({ label: s.name, to: `/dashboard/subjects/${s.id}` })),
      ...(archivedSubjectsData.value ?? []).map(s => ({ label: `[Архив] ${s.name}`, to: `/dashboard/subjects/${s.id}`, icon: 'i-lucide-archive' })),
    ]

    return items.length ? items : [{ label: 'Предметов пока нет', icon: 'i-lucide-book-open', disabled: true }]
  })

  const links = computed<NavigationMenuItem[][]>(() => [
    [{
      label: 'Главная',
      icon: 'i-lucide-house',
      to: '/dashboard',
      exact: true,
    }, {
      label: 'Предметы',
      icon: 'i-lucide-book-open',
      to: '/dashboard/subjects',
      exact: true,
      defaultOpen: true,
      children: subjectChildren.value,
    }, {
      label: 'Groups',
      icon: 'i-lucide-users',
      to: '/dashboard/groups',
    }],
    ...(import.meta.dev
      ? [
          [{
            label: 'Debug',
            icon: 'i-lucide-flask-conical',
            to: '/dashboard/debug',
          }],
        ]
      : []),
    [{
      label: 'Feedback',
      icon: 'i-lucide-message-circle',
      to: 'https://k1mbb.t.me',
      target: '_blank',
    }],
  ])

  return { links }
}
