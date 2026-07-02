<script setup lang="ts">
import type { StudentResponse } from '#hey-api'
import type { Subgroup } from '~/composables/useGroupTabs'
import { deleteGroup, getGroupById } from '#hey-api'

const route = useRoute()
const groupId = computed(() => String(route.params.uuid ?? ''))
const activeGroupName = useState<string | null>(
  'groups-active-name',
  () => null,
)

const { data, pending, error } = useApi(
  { key: `group:${groupId.value}`, watch: [groupId] },
  () => getGroupById({ path: { id: groupId.value } }),
)

const group = computed(() => data.value ?? null)

const deletingGroup = ref(false)
const { loading: deleteGroupPending, submit } = useFormSubmit()

async function onDeleteGroup() {
  await submit(
    () => deleteGroup({ path: { id: groupId.value } }),
    {
      successMessage: 'Группа удалена',
      onSuccess: () => navigateTo('/dashboard/groups'),
    },
  )
  deletingGroup.value = false
}

// Tabs & Table
const subgroupTabPrefix = 'subgroup:'
const activeTab = useStoredTab<string>(() => `group-view:${groupId.value}`, 'students')
const sortDirection = ref<'asc' | 'desc'>('asc')
const studentSearch = ref('')

function toggleNameSort(): void {
  sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
}

const usernameCollator = new Intl.Collator('ru-RU', {
  sensitivity: 'base',
  numeric: true,
})

const {
  tabsData,
  groupTabs,
  availableTabValues,
} = useGroupTabs<StudentResponse>({
  students: computed(() => (group.value?.students ?? [])),
  subgroups: computed(() => (group.value?.subgroups ?? []).map(sg => ({ id: sg.id!, index: sg.index })) as Subgroup[]),
  getId: s => s.id ?? null,
  getUsername: s => s.username ?? '',
  getSubgroupId: s => s.subgroupId ?? null,
  showEmptyStudentsTab: false,
  subgroupTabPrefix,
})

const activeTabData = useActiveTab(tabsData, activeTab)

const activeTabRows = computed(() => {
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

const filteredTabRows = computed(() => {
  let rows = activeTabRows.value
  const q = studentSearch.value.trim().toLowerCase()
  if (q)
    rows = rows.filter(r => r.username.toLowerCase().includes(q))
  return rows
})

watch(
  groupId,
  () => {
    activeGroupName.value = null
    studentSearch.value = ''
  },
  { immediate: true },
)

watch(
  group,
  (value) => {
    activeGroupName.value = value?.name ?? null
  },
  { immediate: true },
)

watch(
  availableTabValues,
  (values) => {
    // Пока вкладок нет (данные ещё грузятся) — не трогаем сохранённый выбор.
    if (!values.length)
      return
    if (!activeTab.value || !values.includes(activeTab.value)) {
      const firstValue = values[0]
      if (firstValue)
        activeTab.value = firstValue
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="flex flex-col gap-6">
    <template v-if="pending && !group">
      <USkeleton class="h-8 w-1/3" />
      <USkeleton class="h-12 w-full" />
      <UCard>
        <template #header>
          <USkeleton class="h-6 w-32" />
        </template>
        <div class="flex flex-col gap-2">
          <USkeleton v-for="i in 5" :key="i" class="h-10 w-full" />
        </div>
      </UCard>
    </template>

    <UAlert
      v-else-if="error"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Ошибка при загрузке группы"
      :description="error.message"
    />

    <template v-else-if="group">
      <UPageHeader :title="group.name ?? ''">
        <template #description>
          {{ (group.students ?? []).length }} студентов · {{ (group.subgroups ?? []).length }} подгрупп
        </template>
        <template #links>
          <UButton
            :to="`/dashboard/groups/${groupId}/edit`"
            label="Редактировать"
            icon="i-lucide-pencil"
            variant="outline"
            color="neutral"
          />
          <UButton
            icon="i-lucide-trash-2"
            color="error"
            variant="ghost"
            @click="deletingGroup = true"
          />
        </template>
      </UPageHeader>

      <UTabs v-if="groupTabs.length" v-model="activeTab" :items="groupTabs" />

      <UCard v-if="groupTabs.length && activeTabData">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <h3 class="text-lg font-semibold">
                {{ activeTabData.title }}
              </h3>
            </div>
            <UButton
              icon="i-lucide-pencil"
              label="Редактировать"
              variant="ghost"
              color="neutral"
              :to="`/dashboard/groups/${groupId}/edit`"
            />
          </div>
        </template>

        <UInput
          v-model="studentSearch"
          icon="i-lucide-search"
          placeholder="Поиск по имени..."
          class="w-full sm:w-72 mb-4"
        />

        <GroupsStudentsTable
          :rows="filteredTabRows"
          :loading="pending"
          :sort-direction="sortDirection"
          :empty-title="activeTabData.emptyTitle"
          :empty-description="activeTabData.emptyDescription"
          @toggle-sort="toggleNameSort"
        />
      </UCard>

      <UCard v-else>
        <UEmpty
          icon="i-lucide-users"
          title="В группе пока нет студентов и подгрупп"
          description="Добавьте студентов в группу или создайте подгруппы."
          variant="naked"
          :actions="[
            {
              label: 'Редактировать группу',
              icon: 'i-lucide-pencil',
              to: `/dashboard/groups/${groupId}/edit`,
            },
          ]"
        />
      </UCard>
    </template>

    <UEmpty
      v-else
      icon="i-lucide-search-x"
      title="Группа не найдена"
      description="Проверьте ссылку или вернитесь к списку групп."
      variant="naked"
      class="h-full"
    />

    <GroupsDeleteModal
      :open="deletingGroup"
      :pending="deleteGroupPending"
      @close="deletingGroup = false"
      @confirm="onDeleteGroup"
    />
  </div>
</template>
