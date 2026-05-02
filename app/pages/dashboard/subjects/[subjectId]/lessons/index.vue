<script setup lang="ts">
import type { LessonResponse, LessonType } from '#shared/types/backend'
import type { TableColumn } from '@nuxt/ui'
import { h, resolveComponent } from 'vue'
import { useLessons } from '~/composables/api/useLessonsApi'

const route = useRoute()
const subjectId = computed(() => String(route.params.subjectId ?? ''))

const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')

const { data, pending, error, refresh } = useLessons({ filter: { subjectId: subjectId.value } })

const searchQuery = ref('')

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

const PENALTY_MODE_LABELS: Record<LessonResponse['penaltyMode'], string> = {
  NONE: 'Без штрафа',
  SUBTRACT: 'Линейный',
  MULTIPLY: 'Геометрический',
}

const allLessons = computed<LessonResponse[]>(() => {
  const val = data.value as any
  if (Array.isArray(val))
    return val
  if (val && Array.isArray(val.content))
    return val.content as LessonResponse[]
  return []
})

const filteredLessons = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q)
    return allLessons.value
  return allLessons.value.filter(l => l.name.toLowerCase().includes(q))
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
    accessorKey: 'penaltyMode',
    header: 'Штраф',
    meta: { class: { th: 'w-40', td: 'w-40' } },
    cell: ({ row }) => {
      if (row.original.penaltyMode === 'NONE')
        return h('span', PENALTY_MODE_LABELS.NONE)
      return h('span', `${PENALTY_MODE_LABELS[row.original.penaltyMode]} (${row.original.penaltyStep})`)
    },
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
      <LessonsCreateBulkScheduleModal :subject-id="subjectId" :after-create="onAfterCreate" />
    </div>

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
          icon="i-lucide-book-open"
          title="Занятий нет"
          description="Создайте первое занятие с помощью кнопок выше."
          variant="naked"
          class="py-12 overflow-visible"
        />
      </template>
    </UTable>
  </section>
</template>
