import type { NavigationMenuItem } from '@nuxt/ui'
import type { Ref } from 'vue'
// import { useSubjectsStore } from '~/stores/subjects'

type DashboardPrimaryLink = NavigationMenuItem & { description: string }

const DASHBOARD_PRIMARY_LINKS = {
  home: {
    label: 'Главная',
    icon: 'i-lucide-house',
    to: '/dashboard',
    exact: true,
    description: 'Быстрый обзор рабочих разделов.',
  },
  subjects: {
    label: 'Предметы',
    icon: 'i-lucide-book-open',
    to: '/dashboard/subjects',
    exact: true,
    description: 'Создание и управление учебными предметами.',
  },
  groups: {
    label: 'Groups',
    icon: 'i-lucide-users',
    to: '/dashboard/groups',
    description: 'Управление группами и участниками.',
  },
  debug: import.meta.dev
    ? {
        label: 'Debug',
        icon: 'i-lucide-flask-conical',
        to: '/dashboard/debug',
        description: 'Проверка запросов к backend в dev-режиме.',
      }
    : null,
  feedback: {
    label: 'Feedback',
    icon: 'i-lucide-message-circle',
    to: 'https://k1mbb.t.me',
    target: '_blank',
    description: 'Связаться и оставить обратную связь.',
  },
} as const satisfies {
  home: DashboardPrimaryLink
  subjects: DashboardPrimaryLink
  groups: DashboardPrimaryLink
  debug: DashboardPrimaryLink | null
  feedback: DashboardPrimaryLink
}

// const SUBJECT_STATUS = {
//   noSession: [{ label: 'Сессия не инициализирована', icon: 'i-lucide-circle-alert', disabled: true }],
//   loading: [{ label: 'Загрузка предметов...', icon: 'i-lucide-loader-circle', disabled: true }],
//   error: [{ label: 'Ошибка загрузки предметов', icon: 'i-lucide-circle-x', disabled: true }],
//   empty: [{ label: 'Предметов пока нет', icon: 'i-lucide-book-open', disabled: true }],
// } as const satisfies Record<string, NavigationMenuItem[]>

export function getDashboardPrimaryLinks(): DashboardPrimaryLink[] {
  return [
    DASHBOARD_PRIMARY_LINKS.home,
    DASHBOARD_PRIMARY_LINKS.subjects,
    DASHBOARD_PRIMARY_LINKS.groups,
    ...(DASHBOARD_PRIMARY_LINKS.debug ? [DASHBOARD_PRIMARY_LINKS.debug] : []),
    DASHBOARD_PRIMARY_LINKS.feedback,
  ]
}

export function useDashboardNavigation(open: Ref<boolean>) {
  // const subjectsStore = useSubjectsStore()

  const closeSidebar = () => {
    open.value = false
  }

  // const subjectChildren = computed<NavigationMenuItem[]>(() => {
  //   if (!subjectsStore.teacherId)
  //     return SUBJECT_STATUS.noSession
  //   if (subjectsStore.activeSubjectsPending)
  //     return SUBJECT_STATUS.loading
  //   if (subjectsStore.activeSubjectsError || (subjectsStore.archivedLoaded && subjectsStore.archivedSubjectsError))
  //     return SUBJECT_STATUS.error

  //   const items = [
  //     ...subjectsStore.activeSubjects.map(s => ({ label: s.name, to: `/dashboard/subjects/${s.id}`, onSelect: closeSidebar })),
  //     ...(subjectsStore.archivedLoaded
  //       ? subjectsStore.archivedSubjects.map(s => ({ label: `[Архив] ${s.name}`, to: `/dashboard/subjects/${s.id}`, icon: 'i-lucide-archive', onSelect: closeSidebar }))
  //       : []),
  //   ]

  //   return items.length ? items : SUBJECT_STATUS.empty
  // })

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

  const homeLink = withSidebarAction(DASHBOARD_PRIMARY_LINKS.home)
  const subjectsLink = withSidebarAction(DASHBOARD_PRIMARY_LINKS.subjects)
  const groupsLink = withSidebarAction(DASHBOARD_PRIMARY_LINKS.groups)
  const debugLink = DASHBOARD_PRIMARY_LINKS.debug ? withSidebarAction(DASHBOARD_PRIMARY_LINKS.debug) : null
  const feedbackLink = withSidebarAction(DASHBOARD_PRIMARY_LINKS.feedback)

  const links = computed(() => {
    return [
      [
        homeLink,
        {
          ...subjectsLink,
          defaultOpen: true,
          // children: subjectChildren.value,
        },
        groupsLink,
      ],
      ...(debugLink ? [[debugLink]] : []),
      [[feedbackLink]],
    ] satisfies NavigationMenuItem[][]
  })

  return { links }
}
