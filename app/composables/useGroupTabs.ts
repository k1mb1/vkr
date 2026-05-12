import type { components } from '#open-fetch-schemas/backend'
import type { TabsItem } from '@nuxt/ui'

type StudentResponse = components['schemas']['StudentResponse']
type SubgroupResponse = components['schemas']['SubgroupResponse']

export interface TabStudentRow {
  key: string
  id: string | null
  username: string
  subgroupId: string | null
  draftIndex: number
}

export type DisplayStudent = StudentResponse

export type Subgroup = SubgroupResponse

export interface TabData {
  value: string
  label: string
  count: number
  icon: string
  title: string
  emptyTitle: string
  emptyDescription: string
  rows: TabStudentRow[]
}

export interface UseGroupTabsOptions {
  students: Ref<DisplayStudent[]>
  subgroups: Ref<Subgroup[]>
  isEditing: Ref<boolean>
  subgroupTabPrefix?: string
}

export interface UseGroupTabsReturn {
  tabsData: ComputedRef<TabData[]>
  groupTabs: ComputedRef<TabsItem[]>
  availableTabValues: ComputedRef<string[]>
  activeTabData: ComputedRef<TabData | null>
}

export function useGroupTabs(options: UseGroupTabsOptions): UseGroupTabsReturn {
  const { students, subgroups, isEditing, subgroupTabPrefix = 'subgroup:' } = options

  const tabsData = computed<TabData[]>(() => {
    const tabs: TabData[] = []
    const groupStudents = students.value
    const hasSubgroups = subgroups.value.length > 0

    const studentsWithoutSubgroup = groupStudents.filter(s => s.subgroupId == null)
    if (!hasSubgroups && (studentsWithoutSubgroup.length > 0 || isEditing.value)) {
      const studentsRows = studentsWithoutSubgroup.map((student, localIndex) => ({
        key: `students:${String(student.id ?? `${student.username}:${localIndex}`)}`,
        id: student.id ?? null,
        username: student.username ?? '',
        subgroupId: student.subgroupId ?? null,
        draftIndex: groupStudents.indexOf(student),
      }))

      tabs.push({
        value: 'students',
        label: 'Студенты',
        count: studentsWithoutSubgroup.length,
        icon: 'i-lucide-users-round',
        title: 'Основные студенты',
        emptyTitle: 'Нет студентов',
        emptyDescription: 'В этой вкладке пока нет студентов.',
        rows: studentsRows,
      })
    }

    for (const [index, subgroup] of subgroups.value.entries()) {
      const tabValue = `${subgroupTabPrefix}${subgroup.id}`
      const subgroupStudents = groupStudents.filter(s => s.subgroupId === subgroup.id)
      const subgroupRows = subgroupStudents.map((student, localIndex) => ({
        key: `${tabValue}:${String(student.id ?? `${student.username}:${localIndex}`)}`,
        id: student.id ?? null,
        username: student.username ?? '',
        subgroupId: student.subgroupId ?? null,
        draftIndex: groupStudents.indexOf(student),
      }))

      const subgroupLabel = `Подгруппа ${(subgroup.index ?? index) + 1}`

      tabs.push({
        value: tabValue,
        label: subgroupLabel,
        count: subgroupStudents.length,
        icon: 'i-lucide-git-fork',
        title: subgroupLabel,
        emptyTitle: 'Подгруппа пуста',
        emptyDescription: 'Студенты для этой подгруппы пока не назначены.',
        rows: subgroupRows,
      })
    }

    return tabs
  })

  const groupTabs = computed<TabsItem[]>(() =>
    tabsData.value.map(tab => ({
      value: tab.value,
      label: tab.label,
      icon: tab.icon,
      badge: tab.count || undefined,
    })),
  )

  const availableTabValues = computed<string[]>(() =>
    tabsData.value.map(tab => tab.value),
  )

  const activeTabData = computed<TabData | null>(() => {
    // Этот computed требует activeTab снаружи — возвращаем просто первый таб
    return tabsData.value[0] ?? null
  })

  return {
    tabsData,
    groupTabs,
    availableTabValues,
    activeTabData,
  }
}

export function useActiveTab(tabsData: Ref<TabData[]>, activeTab: Ref<string>): ComputedRef<TabData | null> {
  return computed(() => {
    const tab = tabsData.value.find(item => item.value === activeTab.value)
    return tab ?? tabsData.value[0] ?? null
  })
}
