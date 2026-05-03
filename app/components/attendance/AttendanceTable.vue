<script setup lang="ts">
import type { PresenceType, SubjectAttendanceResponse } from '#shared/types/backend'
import type { TableColumn } from '@nuxt/ui'
import type { AttendanceRow } from '~/composables/attendance/useAttendanceTable'
import { h } from 'vue'
import { useAttendanceTable } from '~/composables/attendance/useAttendanceTable'
import AttendanceTableLessonCell from './AttendanceTableLessonCell.vue'
import AttendanceTableLessonFooter from './AttendanceTableLessonFooter.vue'
import AttendanceTableLessonHeader from './AttendanceTableLessonHeader.vue'
import AttendanceTableSummaryCell from './AttendanceTableSummaryCell.vue'
import AttendanceTableSummaryFooter from './AttendanceTableSummaryFooter.vue'

interface Props {
  data: SubjectAttendanceResponse | null
  loading?: boolean
  activeType?: string
}

const props = withDefaults(defineProps<Props>(), {
  data: null,
  activeType: 'ALL',
})

const emit = defineEmits<{
  refresh: []
}>()

const {
  searchQuery,
  filteredLessons,
  rows,
  stats,
  getLessonSummary,
  upsertPending,
  onSetAttendance,
} = useAttendanceTable(props, () => emit('refresh'))

const summaryColumn = computed<TableColumn<AttendanceRow>>(() => ({
  accessorKey: '__summary',
  header: () => h('span', 'Итого'),
  footer: () => h(AttendanceTableSummaryFooter, { stats: stats.value }),
  cell: ({ row }) => h(AttendanceTableSummaryCell, {
    row: row.original,
    lessonIds: filteredLessons.value.map(l => l.lessonId),
  }),
}))

const lessonColumns = computed<TableColumn<AttendanceRow>[]>(() => {
  const d = props.data
  if (!d)
    return []

  return filteredLessons.value.map(lesson => ({
    accessorKey: lesson.lessonId,
    header: () => h(AttendanceTableLessonHeader, {
      lessonName: lesson.lessonName,
      type: lesson.type,
      dateTime: lesson.dateTime,
    }),
    footer: () => h(AttendanceTableLessonFooter, {
      summary: getLessonSummary(lesson.lessonId),
      total: d.students.length,
    }),
    cell: ({ row }) => h(AttendanceTableLessonCell, {
      lessonId: lesson.lessonId,
      studentId: row.original.studentId,
      presence: (row.original[lesson.lessonId] as PresenceType) ?? 'NONE',
      isPending: upsertPending.value.has(`${lesson.lessonId}:${row.original.studentId}`),
      onSet: (presence: any) => onSetAttendance(lesson.lessonId, row.original.studentId, presence),
    }),
  }))
})

const columns = computed<TableColumn<AttendanceRow>[]>(() => [
  {
    accessorKey: 'username',
    header: 'Студент',
    footer: 'Итого',
  },
  ...lessonColumns.value,
  summaryColumn.value,
])
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center gap-3">
      <UInput
        v-model="searchQuery"
        placeholder="Поиск студентов..."
        icon="i-lucide-search"
        color="neutral"
        variant="outline"
      />
      <div v-if="stats" class="flex items-center gap-3 text-sm text-muted sm:ml-auto">
        <span>{{ stats.studentCount }} студ.</span>
        <span>{{ stats.lessonCount }} зан.</span>
        <UBadge
          v-if="stats.pct !== null"
          :color="stats.color"
          variant="subtle"
          size="sm"
          :label="`${stats.pct}% посещаемость`"
        />
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-3 text-sm text-muted">
      <UBadge color="success" variant="subtle" icon="i-lucide-check" label="Присутствовал" />
      <UBadge color="warning" variant="subtle" icon="i-lucide-clock" label="Опоздание" />
      <UBadge color="error" variant="subtle" icon="i-lucide-x" label="Отсутствовал" />
      <UBadge color="neutral" variant="subtle" icon="i-lucide-minus" label="Не отмечено" />
      <span class="ml-auto">Нажмите на ячейку для выбора статуса</span>
    </div>

    <div class="rounded-md border border-default">
      <UTable
        :data="rows"
        :columns="columns"
        :loading="loading"
        sticky
        :ui="{ base: 'min-w-full overflow-clip table-fixed', td: 'truncate max-w-48', th: 'truncate max-w-0' }"
      >
        <template #empty>
          <UEmpty
            icon="i-lucide-calendar-x"
            title="Данные посещаемости отсутствуют"
            description="Отметки появятся после проведения занятий."
            variant="naked"
          />
        </template>
      </UTable>
    </div>
  </div>
</template>
