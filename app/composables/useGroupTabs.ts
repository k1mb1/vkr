import type { TabsItem } from '@nuxt/ui'

export interface TabStudentRow<T = unknown> {
  key: string
  id: string | null
  index: number
  username: string
  subgroupId: string | null
  draftIndex: number
  data: T
}

export interface Subgroup {
  id: string
  index?: number | null
}

export interface TabData<T = unknown> {
  value: string
  label: string
  count: number
  icon: string
  title: string
  emptyTitle: string
  emptyDescription: string
  rows: TabStudentRow<T>[]
}

export interface UseGroupTabsOptions<T> {
  students: Ref<T[]>
  subgroups: Ref<Subgroup[]>
  getId: (student: T) => string | null
  getUsername: (student: T) => string
  getSubgroupId: (student: T) => string | null
  showEmptyStudentsTab?: boolean
  subgroupTabPrefix?: string
}

export interface UseGroupTabsReturn<T> {
  tabsData: ComputedRef<TabData<T>[]>
  groupTabs: ComputedRef<TabsItem[]>
  availableTabValues: ComputedRef<string[]>
}

export function useGroupTabs<T>(options: UseGroupTabsOptions<T>): UseGroupTabsReturn<T> {
  const {
    students,
    subgroups,
    getId,
    getUsername,
    getSubgroupId,
    showEmptyStudentsTab = false,
    subgroupTabPrefix = 'subgroup:',
  } = options

  const tabsData = computed<TabData<T>[]>(() => {
    const tabs: TabData<T>[] = []
    const groupStudents = students.value
    const hasSubgroups = subgroups.value.length > 0

    const studentsWithoutSubgroup = groupStudents.filter(s => getSubgroupId(s) == null)
    if (!hasSubgroups && (studentsWithoutSubgroup.length > 0 || showEmptyStudentsTab)) {
      tabs.push({
        value: 'students',
        label: 'Студенты',
        count: studentsWithoutSubgroup.length,
        icon: 'i-lucide-users-round',
        title: 'Основные студенты',
        emptyTitle: 'Нет студентов',
        emptyDescription: 'В этой вкладке пока нет студентов.',
        rows: studentsWithoutSubgroup.map((student, localIndex) => ({
          key: `students:${String(getId(student) ?? `${getUsername(student)}:${localIndex}`)}`,
          id: getId(student),
          index: localIndex + 1,
          username: getUsername(student),
          subgroupId: getSubgroupId(student),
          draftIndex: groupStudents.indexOf(student),
          data: student,
        })),
      })
    }

    for (const [index, subgroup] of subgroups.value.entries()) {
      const tabValue = `${subgroupTabPrefix}${subgroup.id}`
      const subgroupStudents = groupStudents.filter(s => getSubgroupId(s) === subgroup.id)

      const subgroupLabel = `Подгруппа ${(subgroup.index ?? index) + 1}`

      tabs.push({
        value: tabValue,
        label: subgroupLabel,
        count: subgroupStudents.length,
        icon: 'i-lucide-git-fork',
        title: subgroupLabel,
        emptyTitle: 'Подгруппа пуста',
        emptyDescription: 'Студенты для этой подгруппы пока не назначены.',
        rows: subgroupStudents.map((student, localIndex) => ({
          key: `${tabValue}:${String(getId(student) ?? `${getUsername(student)}:${localIndex}`)}`,
          id: getId(student),
          index: localIndex + 1,
          username: getUsername(student),
          subgroupId: getSubgroupId(student),
          draftIndex: groupStudents.indexOf(student),
          data: student,
        })),
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

  return {
    tabsData,
    groupTabs,
    availableTabValues,
  }
}

export function useActiveTab<T>(tabsData: Ref<TabData<T>[]>, activeTab: Ref<string>): ComputedRef<TabData<T> | null> {
  return computed(() => {
    const tab = tabsData.value.find(item => item.value === activeTab.value)
    return tab ?? tabsData.value[0] ?? null
  })
}
