import type { NavigationMenuItem } from '@nuxt/ui'
import type { Ref } from 'vue'
import { computed } from 'vue'

type DashboardPrimaryLink = NavigationMenuItem & {
  description: string
  external?: boolean
}

const DASHBOARD_PRIMARY_LINKS = [
  {
    key: 'home',
    label: 'Главная',
    icon: 'i-lucide-house',
    to: '/dashboard',
    exact: true,
    description: 'Быстрый обзор рабочих разделов.',
  },
  {
    key: 'subjects',
    label: 'Предметы',
    icon: 'i-lucide-book-open',
    to: '/dashboard/subjects',
    description: 'Создание и управление учебными предметами.',
    defaultOpen: true,
  },
  {
    key: 'groups',
    label: 'Группы студентов',
    icon: 'i-lucide-users',
    to: '/dashboard/groups',
    description: 'Управление группами и участниками.',
  },
  {
    key: 'feedback',
    label: 'Feedback',
    icon: 'i-lucide-message-circle',
    to: 'https://k1mbb.t.me',
    target: '_blank',
    description: 'Связаться и оставить обратную связь.',
    external: true,
  },
] as const satisfies readonly DashboardPrimaryLink[]

export function getDashboardPrimaryLinks(): DashboardPrimaryLink[] {
  return [...DASHBOARD_PRIMARY_LINKS]
}

const isExternal = (item: NavigationMenuItem) => item.target === '_blank'

export function useDashboardNavigation(open: Ref<boolean>) {
  const { children: subjectChildren } = useSubjectNavigation()

  const closeSidebar = () => {
    open.value = false
  }

  const enhanceItem = (item: DashboardPrimaryLink): NavigationMenuItem => {
    return {
      ...item,
      onSelect: closeSidebar,
      children: item.key === 'subjects' ? subjectChildren.value : item.children,
    }
  }

  const links = computed<NavigationMenuItem[][]>(() => {
    const primary = DASHBOARD_PRIMARY_LINKS
      .filter(i => !isExternal(i))
      .map(enhanceItem)

    const secondary = DASHBOARD_PRIMARY_LINKS
      .filter(isExternal)
      .map(enhanceItem)

    return [primary, secondary.length ? [secondary] : []]
  })

  return { links }
}
