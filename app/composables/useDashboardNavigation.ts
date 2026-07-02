import type { CommandPaletteGroup, CommandPaletteItem, NavigationMenuItem } from '@nuxt/ui'
import type { Ref } from 'vue'
import { computed } from 'vue'

type DashboardPrimaryLink = NavigationMenuItem & {
  description: string
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
] as const satisfies readonly DashboardPrimaryLink[]

export function getDashboardPrimaryLinks(): DashboardPrimaryLink[] {
  return [...DASHBOARD_PRIMARY_LINKS]
}

export function useDashboardNavigation(open: Ref<boolean>) {
  const { subjects, children: subjectChildren } = useSubjectNavigation()

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

  const links = computed<NavigationMenuItem[][]>(() => [
    DASHBOARD_PRIMARY_LINKS.map(enhanceItem),
  ])

  // Группы для командной палитры (Ctrl/⌘+K): быстрый переход к разделам и к
  // любому предмету без блуждания по сайдбару.
  const searchGroups = computed<CommandPaletteGroup<CommandPaletteItem>[]>(() => {
    const groups: CommandPaletteGroup<CommandPaletteItem>[] = [
      {
        id: 'sections',
        label: 'Разделы',
        items: DASHBOARD_PRIMARY_LINKS.map(i => ({
          label: i.label,
          icon: i.icon,
          to: i.to,
        })),
      },
    ]

    if (subjects.value.length) {
      groups.push({
        id: 'subjects',
        label: 'Предметы',
        items: subjects.value.map<CommandPaletteItem>(s => ({
          label: s.name ?? 'Без названия',
          icon: 'i-lucide-book-open',
          to: `/dashboard/subjects/${s.id}`,
          onSelect: closeSidebar,
        })),
      })
    }

    return groups
  })

  return { links, searchGroups }
}
