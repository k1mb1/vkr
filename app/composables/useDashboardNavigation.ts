import type { FindSubjectsFilter } from '#shared/types/backend'
import type { NavigationMenuItem } from '@nuxt/ui'
import { useSubjectsApi } from '~/composables/api/useSubjectsApi'

function createSection(
  items: NavigationMenuItem[],
  condition = true,
): NavigationMenuItem[][] {
  return condition ? [items] : []
}

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

  const {
    data: activeSubjectsData,
    pending: activeSubjectsPending,
    error: activeSubjectsError,
    refresh: refreshActiveSubjects,
  } = findAllByTeacherId(
    safeTeacherId,
    activeFilter,
    {
      immediate: false,
    },
  )

  const {
    data: archivedSubjectsData,
    pending: archivedSubjectsPending,
    error: archivedSubjectsError,
    refresh: refreshArchivedSubjects,
  } = findAllByTeacherId(
    safeTeacherId,
    archivedFilter,
    {
      immediate: false,
    },
  )

  watch(teacherId, async (value) => {
    if (!value) {
      return
    }

    await Promise.all([
      refreshActiveSubjects(),
      refreshArchivedSubjects(),
    ])
  }, { immediate: true })

  const subjectChildren = computed<NavigationMenuItem[]>(() => {
    if (!teacherId.value) {
      return [{
        label: 'Сессия не инициализирована',
        icon: 'i-lucide-circle-alert',
        disabled: true,
      }]
    }

    if (activeSubjectsPending.value || archivedSubjectsPending.value) {
      return [{
        label: 'Загрузка предметов...',
        icon: 'i-lucide-loader-circle',
        disabled: true,
      }]
    }

    if (activeSubjectsError.value || archivedSubjectsError.value) {
      return [{
        label: 'Ошибка загрузки предметов',
        icon: 'i-lucide-circle-x',
        disabled: true,
      }]
    }

    const activeSubjects = activeSubjectsData.value ?? []
    const archivedSubjects = archivedSubjectsData.value ?? []

    const activeItems = activeSubjects.map(subject => ({
      label: subject.name,
      to: `/dashboard/subjects/${subject.id}`,
      icon: 'i-lucide-book-open',
    }))

    const archivedItems = archivedSubjects.map(subject => ({
      label: `[Архив] ${subject.name}`,
      to: `/dashboard/subjects/${subject.id}`,
      icon: 'i-lucide-archive',
    }))

    const items = [...activeItems, ...archivedItems]

    if (!items.length) {
      return [{
        label: 'Предметов пока нет',
        icon: 'i-lucide-book-open',
        disabled: true,
      }]
    }

    return items
  })

  const subjectsSection = computed<NavigationMenuItem[]>(() => [
    {
      label: 'Subjects',
      type: 'label',
    },
    ...subjectChildren.value,
  ])

  const mainLinks = computed<NavigationMenuItem[]>(() => [
    {
      label: 'Главная',
      icon: 'i-lucide-house',
      to: '/dashboard',
      exact: true,
    },
    {
      label: 'Предметы',
      icon: 'i-lucide-book-open',
      to: '/dashboard/subjects',
    },
    {
      label: 'Groups',
      icon: 'i-lucide-users',
      to: '/dashboard/groups',
    },
  ])

  const debugLinks: NavigationMenuItem[] = [
    {
      label: 'Debug',
      icon: 'i-lucide-flask-conical',
      to: '/dashboard/debug',
    },
  ]

  const externalLinks: NavigationMenuItem[] = [
    {
      label: 'Feedback',
      icon: 'i-lucide-message-circle',
      to: 'https://k1mbb.t.me',
      target: '_blank',
    },
  ]

  const sections = computed<NavigationMenuItem[][]>(() => [
    ...createSection(mainLinks.value),
    ...createSection(subjectsSection.value),
    ...createSection(debugLinks, import.meta.dev),
    ...createSection(externalLinks),
  ])

  return { links: sections }
}
