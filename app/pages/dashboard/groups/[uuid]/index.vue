<script setup lang="ts">
import type { StudentGroupResponse } from '#shared/types/backend'
import type { TabsItem } from '@nuxt/ui'
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

type Subgroup = NonNullable<StudentGroupResponse['subgroups']>[number]
type GroupTabValue = 'students' | `${typeof subgroupTabPrefix}${string}`

const activeTab = ref<GroupTabValue>('students')

const subgroupTabMap = computed<Record<string, Subgroup>>(() => {
  return Object.fromEntries(
    (group.value?.subgroups ?? []).map(subgroup => [
      `${subgroupTabPrefix}${String(subgroup.id)}`,
      subgroup,
    ]),
  )
})

const groupTabs = computed<TabsItem[]>(() => {
  const tabs: TabsItem[] = []

  if (studentsCount.value > 0) {
    tabs.push({
      label: `Студенты (${studentsCount.value})`,
      icon: 'i-lucide-users-round',
      value: 'students',
    })
  }

  for (const subgroup of group.value?.subgroups ?? []) {
    tabs.push({
      label: `${subgroup.name} (${subgroup.students.length})`,
      icon: 'i-lucide-git-fork',
      value: `${subgroupTabPrefix}${String(subgroup.id)}`,
    })
  }

  return tabs
})

const preferredTab = computed<GroupTabValue | null>(() => {
  if (studentsCount.value > 0) {
    return 'students'
  }

  const firstSubgroup = group.value?.subgroups?.[0]
  if (!firstSubgroup) {
    return null
  }

  return `${subgroupTabPrefix}${String(firstSubgroup.id)}`
})

function getSubgroupFromTabValue(value: string | number | undefined): Subgroup | null {
  if (value === undefined) {
    return null
  }

  return subgroupTabMap.value[String(value)] ?? null
}

watch(groupId, () => {
  activeGroupName.value = null
}, { immediate: true })

watch(group, (value) => {
  activeGroupName.value = value?.name ?? null
}, { immediate: true })

watch(groupTabs, (tabs) => {
  const availableValues = tabs.map(item => String(item.value))

  if (!availableValues.length) {
    activeTab.value = 'students'
    return
  }

  if (!activeTab.value || !availableValues.includes(activeTab.value)) {
    activeTab.value = preferredTab.value ?? (availableValues[0] as GroupTabValue)
  }
}, { immediate: true })
</script>

<template>
  <div class="flex h-full flex-col gap-4 p-4 sm:p-6">
    <div v-if="pending" class="space-y-4">
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
      >
        <template #content="{ item }">
          <UCard
            v-if="item.value === 'students'"
            class="mt-4"
          >
            <template #header>
              <div class="flex items-center justify-between gap-3">
                <h3 class="text-lg font-semibold">
                  Студенты
                </h3>
                <UBadge color="neutral" variant="soft">
                  {{ studentsCount }}
                </UBadge>
              </div>
            </template>

            <ul class="list-disc list-inside space-y-1.5">
              <li
                v-for="(student, index) in group.students"
                :key="student.id || index"
                class="text-sm text-muted"
              >
                {{ student.username }}
              </li>
            </ul>
          </UCard>

          <UCard
            v-else-if="getSubgroupFromTabValue(item.value)"
            class="mt-4"
          >
            <template #header>
              <div class="flex items-center justify-between gap-3">
                <h4 class="font-medium">
                  {{ getSubgroupFromTabValue(item.value)?.name }}
                </h4>
                <UBadge color="neutral" variant="subtle">
                  {{ getSubgroupFromTabValue(item.value)?.students.length ?? 0 }}
                </UBadge>
              </div>
            </template>

            <ul
              v-if="(getSubgroupFromTabValue(item.value)?.students.length ?? 0) > 0"
              class="list-disc list-inside space-y-1.5"
            >
              <li
                v-for="(student, index) in getSubgroupFromTabValue(item.value)?.students ?? []"
                :key="student.id || index"
                class="text-sm text-muted"
              >
                {{ student.username }}
              </li>
            </ul>

            <UEmpty
              v-else
              icon="i-lucide-users-round"
              title="Подгруппа пуста"
              description="Студенты для этой подгруппы пока не назначены."
              variant="naked"
              class="py-3"
            />
          </UCard>
        </template>
      </UTabs>

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
