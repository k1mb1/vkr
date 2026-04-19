<script setup lang="ts">
import type { FindSubjectsFilter, SubjectResponse } from '#shared/types/backend'
import type { TableColumn, TabsItem } from '@nuxt/ui'
import { h, resolveComponent } from 'vue'
import { useSubjectsApi } from '~/composables/api/useSubjectsApi'

const { user } = useOidcAuth()
const { findAllByTeacherId } = useSubjectsApi()

const activeTab = ref<string>('active')
const searchQuery = ref('')
const archivedLoaded = ref(false)

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
} = findAllByTeacherId(safeTeacherId, activeFilter, { immediate: false })

const {
  data: archivedSubjectsData,
  pending: archivedSubjectsPending,
  error: archivedSubjectsError,
  refresh: refreshArchivedSubjects,
} = findAllByTeacherId(safeTeacherId, archivedFilter, { immediate: false })

const activeSubjects = computed(() => activeSubjectsData.value ?? [])
const archivedSubjects = computed(() => archivedSubjectsData.value ?? [])

function filter(list: SubjectResponse[]) {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q)
    return list
  return list.filter(s =>
    s.name.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q),
  )
}

const filteredActive = computed(() => filter(activeSubjects.value))
const filteredArchived = computed(() => filter(archivedSubjects.value))

const tabs = computed<TabsItem[]>(() => [
  {
    label: 'Активные',
    value: 'active',
    icon: 'i-lucide-book-open',
    badge: activeSubjects.value.length || undefined,
  },
  {
    label: 'Архивные',
    value: 'archived',
    icon: 'i-lucide-archive',
    badge: archivedSubjects.value.length || undefined,
  },
])

const isArchived = computed(() => activeTab.value === 'archived')
const currentSubjects = computed(() => isArchived.value ? filteredArchived.value : filteredActive.value)
const currentPending = computed(() => isArchived.value ? archivedSubjectsPending.value : activeSubjectsPending.value)
const currentError = computed(() => isArchived.value ? archivedSubjectsError.value : activeSubjectsError.value)

const UButton = resolveComponent('UButton')

const columns: TableColumn<SubjectResponse>[] = [
  {
    accessorKey: 'name',
    header: 'Название',
    meta: { class: { th: 'w-2/5', td: 'w-2/5 max-w-0 overflow-hidden' } },
    cell: ({ row }) => h('span', row.original.name),
  },
  {
    accessorKey: 'description',
    header: 'Описание',
    meta: { class: { th: 'w-2/5', td: 'w-2/5 max-w-0 overflow-hidden' } },
    cell: ({ row }) => h('span', row.original.description || '—'),
  },
  {
    accessorKey: 'createdAt',
    header: 'Создан',
    meta: { class: { th: 'w-32', td: 'w-32' } },
    cell: ({ row }) => h('span', new Date(row.original.createdAt).toLocaleDateString('ru-RU')),
  },
  {
    id: 'actions',
    header: '',
    meta: { class: { th: 'w-12', td: 'w-12' } },
    cell: ({ row }) => h(UButton, {
      color: 'neutral',
      variant: 'ghost',
      icon: 'i-lucide-chevron-right',
      to: `/dashboard/subjects/${row.original.id}`,
      onClick: (e: Event) => e.stopPropagation(),
    }),
  },
]

watch(teacherId, async (value) => {
  if (!value) {
    archivedLoaded.value = false
    return
  }
  await refreshActiveSubjects()
}, { immediate: true })

watch(activeTab, async (value) => {
  if (value !== 'archived' || archivedLoaded.value || !teacherId.value)
    return
  archivedLoaded.value = true
  await refreshArchivedSubjects()
})

async function onRefresh() {
  if (!teacherId.value)
    return
  if (isArchived.value) {
    archivedLoaded.value = true
    await refreshArchivedSubjects()
  }
  else {
    await refreshActiveSubjects()
  }
}

function onSelectRow(_e: Event, row: { original: SubjectResponse }) {
  navigateTo(`/dashboard/subjects/${row.original.id}`)
}
</script>

<template>
  <UTabs
    v-model="activeTab"
    :items="tabs"
    :content="false"
  />

  <div class="flex items-center gap-3 flex-wrap">
    <UInput
      v-model="searchQuery"
      placeholder="Поиск..."
      icon="i-lucide-search"
      color="neutral"
      variant="outline"
      :disabled="!teacherId"
    />

    <UButton
      color="neutral"
      variant="ghost"
      icon="i-lucide-refresh-cw"
      :loading="currentPending"
      :disabled="!teacherId"
      @click="onRefresh"
    />
  </div>

  <UAlert
    v-if="currentError"
    color="error"
    variant="soft"
    icon="i-lucide-circle-x"
    title="Ошибка загрузки"
    :description="currentError.message"
  />

  <UTable
    :data="currentSubjects"
    :columns="columns"
    :loading="currentPending"
    @select="onSelectRow"
  >
    <template #empty>
      <UEmpty
        :icon="isArchived ? 'i-lucide-archive' : 'i-lucide-book-open'"
        :title="isArchived ? 'Архивных предметов нет' : 'Активных предметов нет'"
        :description="!isArchived ? 'Создайте первый предмет с помощью кнопки выше.' : undefined"
        variant="naked"
        class="py-12 overflow-visible"
      />
    </template>
  </UTable>
</template>
