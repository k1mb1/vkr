<script setup lang="ts">
import type { SubjectResponse } from '#shared/types/backend'
import type { BreadcrumbItem, TableColumn, TabsItem } from '@nuxt/ui'
import { h, resolveComponent } from 'vue'
import { useSubjectsStore } from '~/stores/subjects'

const subjectsStore = useSubjectsStore()

const activeTab = ref<string>('active')
const searchQuery = ref('')

const activeSubjects = computed(() => subjectsStore.activeSubjects)
const archivedSubjects = computed(() => subjectsStore.archivedSubjects)

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
const currentPending = computed(() => isArchived.value ? subjectsStore.archivedSubjectsPending : subjectsStore.activeSubjectsPending)
const currentError = computed(() => isArchived.value ? subjectsStore.archivedSubjectsError : subjectsStore.activeSubjectsError)

const UButton = resolveComponent('UButton')

function setActiveSubject(subject: SubjectResponse): void {
  subjectsStore.setActiveSubject(subject)
}

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
      onClick: (e: Event) => {
        e.stopPropagation()
        setActiveSubject(row.original)
      },
    }),
  },
]

watch(activeTab, async (value) => {
  if (value !== 'archived')
    return

  await subjectsStore.loadArchivedSubjectsOnce()
})

async function onRefresh() {
  if (!subjectsStore.teacherId)
    return

  await subjectsStore.refreshForCurrentTab(isArchived.value)
}

function onSelectRow(_e: Event, row: { original: SubjectResponse }) {
  setActiveSubject(row.original)
  navigateTo(`/dashboard/subjects/${row.original.id}`)
}

const breadcrumbItems = computed<BreadcrumbItem[]>(() => {
  return [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Subjects', to: '/dashboard/subjects' },
  ]
})
</script>

<template>
  <NuxtLayout name="dashboard" panel-id="dashboard-subjects" panel-title="Subjects">
    <template #navbar-title>
      <UBreadcrumb :items="breadcrumbItems" />
    </template>

    <template #navbar-right>
      <SubjectsCreateToolbarForm />
    </template>

    <div class="flex flex-col gap-4">
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
          :disabled="!subjectsStore.teacherId"
        />

        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-refresh-cw"
          :loading="currentPending"
          :disabled="!subjectsStore.teacherId"
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
        sticky
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
    </div>
  </NuxtLayout>
</template>
