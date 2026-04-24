<script setup lang="ts">
import type { LessonResponse, LessonType } from '#shared/types/backend'
import type { TableColumn } from '@nuxt/ui'
import { h, resolveComponent } from 'vue'
import { useLessonsApi } from '~/composables/api/useLessonsApi'

const route = useRoute()
const subjectId = computed(() => String(route.params.subjectId ?? ''))

const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')

const { findAllBySubjectId } = useLessonsApi()
const { data, pending, error, refresh } = findAllBySubjectId(subjectId)

const searchQuery = ref('')
const activeTab = ref<'active' | 'archived'>('active')

const LESSON_TYPE_LABELS: Record<LessonType, string> = {
  NONE: 'Без типа',
  LECTURE: 'Лекция',
  PRACTICE: 'Практика',
}

const LESSON_TYPE_COLORS: Record<LessonType, string> = {
  NONE: 'neutral',
  LECTURE: 'primary',
  PRACTICE: 'secondary',
}

const allLessons = computed(() => data.value ?? [])
const activeLessons = computed(() => allLessons.value.filter(l => !l.archived))
const archivedLessons = computed(() => allLessons.value.filter(l => l.archived))

const tabs = computed(() => [
  { label: 'Активные', value: 'active', icon: 'i-lucide-book-open', badge: activeLessons.value.length || undefined },
  { label: 'Архивные', value: 'archived', icon: 'i-lucide-archive', badge: archivedLessons.value.length || undefined },
])

const currentList = computed(() =>
  activeTab.value === 'archived' ? archivedLessons.value : activeLessons.value,
)

const filteredLessons = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q)
    return currentList.value
  return currentList.value.filter(l => l.name.toLowerCase().includes(q))
})

function onAfterCreate() {
  refresh()
}

const columns: TableColumn<LessonResponse>[] = [
  {
    accessorKey: 'name',
    header: 'Название',
    meta: { class: { th: 'w-2/5', td: 'w-2/5 max-w-0 overflow-hidden' } },
    cell: ({ row }) => h('span', row.original.name),
  },
  {
    accessorKey: 'type',
    header: 'Тип',
    meta: { class: { th: 'w-32', td: 'w-32' } },
    cell: ({ row }) =>
      h(UBadge, {
        label: LESSON_TYPE_LABELS[row.original.type],
        color: LESSON_TYPE_COLORS[row.original.type],
        variant: 'soft',
        size: 'sm',
      }),
  },
  {
    accessorKey: 'dateTime',
    header: 'Дата',
    meta: { class: { th: 'w-40', td: 'w-40' } },
    cell: ({ row }) => {
      const dt = row.original.dateTime
      if (!dt)
        return h('span', { class: 'text-muted' }, '—')
      return h('span', new Date(dt).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }))
    },
  },
  {
    accessorKey: 'decayFactor',
    header: 'Коэф. спада',
    meta: { class: { th: 'w-28', td: 'w-28' } },
    cell: ({ row }) => h('span', row.original.decayFactor),
  },
  {
    id: 'actions',
    header: '',
    meta: { class: { th: 'w-12', td: 'w-12' } },
    cell: ({ row }) =>
      h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        icon: 'i-lucide-chevron-right',
        to: `/dashboard/subjects/${subjectId.value}/lessons/${row.original.id}`,
      }),
  },
]

function onSelectRow(_e: Event, row: { original: LessonResponse }) {
  navigateTo(`/dashboard/subjects/${subjectId.value}/lessons/${row.original.id}`)
}
</script>

<template>
  <section class="flex flex-col gap-4">
    <div>
      <h1 class="text-xl font-semibold">
        Занятия
      </h1>
    </div>

    <div class="flex flex-wrap gap-2">
      <LessonsCreateLessonModal :subject-id="subjectId" :after-create="onAfterCreate" />
      <LessonsCreateLessonsByTypeModal :subject-id="subjectId" :after-create="onAfterCreate" />
      <LessonsCreateBulkScheduleModal :subject-id="subjectId" :after-create="onAfterCreate" />
    </div>

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
      />
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-lucide-refresh-cw"
        :loading="pending"
        @click="refresh"
      />
    </div>

    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      icon="i-lucide-circle-x"
      title="Ошибка загрузки"
      :description="error.message"
    />

    <UTable
      :data="filteredLessons"
      :columns="columns"
      :loading="pending"
      sticky
      @select="onSelectRow"
    >
      <template #empty>
        <UEmpty
          :icon="activeTab === 'archived' ? 'i-lucide-archive' : 'i-lucide-book-open'"
          :title="activeTab === 'archived' ? 'Архивных занятий нет' : 'Занятий нет'"
          :description="activeTab !== 'archived' ? 'Создайте первое занятие с помощью кнопок выше.' : undefined"
          variant="naked"
          class="py-12 overflow-visible"
        />
      </template>
    </UTable>
  </section>
</template>
