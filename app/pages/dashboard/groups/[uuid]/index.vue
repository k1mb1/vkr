<script setup lang="ts">
import type { StudentGroupResponse } from '#shared/types/backend'
import type { TableColumn, TabsItem } from '@nuxt/ui'
import { useStudentsGroupsApi } from '~/composables/api/useStudentsGroups'
import { useGroupsBreadcrumbLabel } from '~/composables/useGroupsBreadcrumbItems'

const route = useRoute()
const groupId = computed(() => String(route.params.uuid ?? ''))
const activeGroupName = useGroupsBreadcrumbLabel()

const { findById } = useStudentsGroupsApi()
const {
  data,
  pending,
  error,
} = findById(groupId)

const group = computed<StudentGroupResponse | null>(() => data.value ?? null)
const studentsCount = computed(() => group.value?.students?.length ?? 0)
const subgroupTabPrefix = 'subgroup:'

type SortDirection = 'asc' | 'desc'

interface StudentTableRow {
  key: string
  index: number
  username: string
}

const activeTab = ref('students')
const sortDirection = ref<SortDirection>('asc')

const sortDirectionLabel = computed(() => {
  return sortDirection.value === 'asc' ? 'по возрастанию' : 'по убыванию'
})

function toggleNameSort(): void {
  sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
}

const usernameCollator = new Intl.Collator('ru-RU', {
  sensitivity: 'base',
  numeric: true,
})

const tableColumns: TableColumn<StudentTableRow>[] = [
  {
    accessorKey: 'index',
    header: '№',
  },
  {
    accessorKey: 'username',
    header: 'Имя',
  },
]

const tabsData = computed(() => {
  const tabs: Array<{
    value: string
    label: string
    icon: string
    title: string
    emptyTitle: string
    emptyDescription: string
    rows: Array<{ key: string, username: string }>
  }> = []

  if (studentsCount.value > 0) {
    const studentsRows = (group.value?.students ?? []).map((student, localIndex) => ({
      key: `students:${String(student.id ?? `${student.username}:${localIndex}`)}`,
      username: student.username,
    }))

    tabs.push({
      value: 'students',
      label: `Студенты (${studentsCount.value})`,
      icon: 'i-lucide-users-round',
      title: 'Основные студенты',
      emptyTitle: 'Нет студентов',
      emptyDescription: 'В этой вкладке пока нет студентов.',
      rows: studentsRows,
    })
  }

  for (const subgroup of group.value?.subgroups ?? []) {
    const tabValue = `${subgroupTabPrefix}${String(subgroup.id)}`
    const subgroupRows = subgroup.students.map((student, localIndex) => ({
      key: `${tabValue}:${String(student.id ?? `${student.username}:${localIndex}`)}`,
      username: student.username,
    }))

    tabs.push({
      value: tabValue,
      label: `${subgroup.name} (${subgroup.students.length})`,
      icon: 'i-lucide-git-fork',
      title: subgroup.name,
      emptyTitle: 'Подгруппа пуста',
      emptyDescription: 'Студенты для этой подгруппы пока не назначены.',
      rows: subgroupRows,
    })
  }

  return tabs
})

const groupTabs = computed<TabsItem[]>(() => {
  return tabsData.value.map(tab => ({
    value: tab.value,
    label: tab.label,
    icon: tab.icon,
  }))
})
const availableTabValues = computed<string[]>(() => tabsData.value.map(tab => tab.value))

const activeTabData = computed(() => {
  const tab = tabsData.value.find(item => item.value === activeTab.value)
  if (tab) {
    return tab
  }

  return tabsData.value[0] ?? null
})

const activeTabRows = computed<StudentTableRow[]>(() => {
  const sourceRows = activeTabData.value?.rows ?? []
  const sortedRows = [...sourceRows].sort((left, right) => {
    return sortDirection.value === 'asc'
      ? usernameCollator.compare(left.username, right.username)
      : usernameCollator.compare(right.username, left.username)
  })

  return sortedRows.map((row, index) => ({
    ...row,
    index: index + 1,
  }))
})

watch(groupId, () => {
  activeGroupName.value = null
}, { immediate: true })

watch(group, (value) => {
  activeGroupName.value = value?.name ?? null
}, { immediate: true })

watch(availableTabValues, (values) => {
  if (!values.length) {
    activeTab.value = 'students'
    return
  }

  if (!activeTab.value || !values.includes(activeTab.value)) {
    const firstValue = values[0]
    if (firstValue) {
      activeTab.value = firstValue
    }
  }
}, { immediate: true })
</script>

<template>
  <div class="p-4">
    <div v-if="pending && !group" class="space-y-4">
      <USkeleton class="h-8 w-1/3" />
      <USkeleton class="h-36 w-full" />
      <USkeleton class="h-36 w-full" />
    </div>

    <UAlert
      v-else-if="error"
      color="error"
      variant="soft"
      title="Ошибка при загрузке группы"
      :description="error.message"
    />

    <template v-else-if="group">
      <UTabs
        v-if="groupTabs.length"
        v-model="activeTab"
        :items="groupTabs"
        color="neutral"
        variant="link"
        :ui="{ trigger: 'grow' }"
        class="w-full"
      />

      <UCard v-if="groupTabs.length && activeTabData">
        <template #header>
          <div class="flex items-center gap-2">
            <h3 class="text-lg font-semibold">
              {{ activeTabData.title }}
            </h3>
            <UBadge color="neutral" variant="soft">
              {{ activeTabRows.length }}
            </UBadge>
          </div>
        </template>

        <UTable
          :data="activeTabRows"
          :columns="tableColumns"
          :loading="pending"
          loading-animation="carousel"
          sticky="header"
        >
          <template #username-header>
            <UButton
              color="neutral"
              variant="ghost"
              :icon="sortDirection === 'asc' ? 'i-lucide-arrow-up-narrow-wide' : 'i-lucide-arrow-down-wide-narrow'"
              :aria-label="`Сортировать по имени (${sortDirectionLabel})`"
              @click="toggleNameSort"
            >
              Имя
            </UButton>
          </template>

          <template #empty>
            <UEmpty
              icon="i-lucide-users-round"
              :title="activeTabData.emptyTitle"
              :description="activeTabData.emptyDescription"
              variant="naked"
              class="py-6"
            />
          </template>
        </UTable>
      </UCard>

      <UEmpty
        v-else
        icon="i-lucide-users"
        title="В группе пока нет студентов и подгрупп"
        description="Добавьте студентов в группу или создайте подгруппы."
        variant="naked"
        class="rounded-lg border border-default py-8"
      />
    </template>

    <UEmpty
      v-else
      icon="i-lucide-search-x"
      title="Группа не найдена"
      description="Проверьте ссылку или вернитесь к списку групп."
      variant="naked"
      class="h-full"
    />
  </div>
</template>
