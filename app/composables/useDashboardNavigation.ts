import type { FindSubjectsFilter } from '#shared/types/backend'
import type { NavigationMenuItem } from '@nuxt/ui'
import type { Ref } from 'vue'
import { useSubjectsApi } from '~/composables/api/useSubjectsApi'

export function getDashboardPrimaryLinks(): Array<NavigationMenuItem & { description: string }> {
  return [
    {
      label: 'Главная',
      icon: 'i-lucide-house',
      to: '/dashboard',
      exact: true,
      description: 'Быстрый обзор рабочих разделов.',
    },
    {
      label: 'Предметы',
      icon: 'i-lucide-book-open',
      to: '/dashboard/subjects',
      exact: true,
      description: 'Создание и управление учебными предметами.',
    },
    {
      label: 'Groups',
      icon: 'i-lucide-users',
      to: '/dashboard/groups',
      description: 'Управление группами и участниками.',
    },
    ...(import.meta.dev
      ? [{
          label: 'Debug',
          icon: 'i-lucide-flask-conical',
          to: '/dashboard/debug',
          description: 'Проверка запросов к backend в dev-режиме.',
        }]
      : []),
    {
      label: 'Feedback',
      icon: 'i-lucide-message-circle',
      to: 'https://k1mbb.t.me',
      target: '_blank',
      description: 'Связаться и оставить обратную связь.',
    },
  ]
}

export function useDashboardNavigation(open: Ref<boolean>) {
  const { user } = useOidcAuth()
  const { findAllByTeacherId } = useSubjectsApi()

  const closeSidebar = () => {
    open.value = false
  }

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
      ...(activeSubjectsData.value ?? []).map(s => ({ label: s.name, to: `/dashboard/subjects/${s.id}`, onSelect: closeSidebar })),
      ...(archivedSubjectsData.value ?? []).map(s => ({ label: `[Архив] ${s.name}`, to: `/dashboard/subjects/${s.id}`, icon: 'i-lucide-archive', onSelect: closeSidebar })),
    ]

    return items.length ? items : [{ label: 'Предметов пока нет', icon: 'i-lucide-book-open', disabled: true }]
  })

  const withSidebarAction = (item: NavigationMenuItem): NavigationMenuItem => {
    return {
      label: item.label,
      icon: item.icon,
      to: item.to,
      exact: item.exact,
      target: item.target,
      onSelect: closeSidebar,
    }
  }

  const links = computed(() => {
    const primaryLinks = getDashboardPrimaryLinks()
    const homeLink = primaryLinks[0]
    const subjectsLink = primaryLinks[1]
    const groupsLink = primaryLinks[2]
    const feedbackLink = primaryLinks.at(-1)
    const debugLink = import.meta.dev ? primaryLinks[3] : null

    return [
      [
        ...(homeLink ? [{ ...withSidebarAction(homeLink) }] : []),
        ...(subjectsLink
          ? [{
              ...withSidebarAction(subjectsLink),
              defaultOpen: true,
              children: subjectChildren.value,
            }]
          : []),
        ...(groupsLink ? [{ ...withSidebarAction(groupsLink) }] : []),
      ],
      ...(debugLink ? [[{ ...withSidebarAction(debugLink) }]] : []),
      ...(feedbackLink ? [[{ ...withSidebarAction(feedbackLink) }]] : []),
    ] satisfies NavigationMenuItem[][]
  })

  return { links }
}
