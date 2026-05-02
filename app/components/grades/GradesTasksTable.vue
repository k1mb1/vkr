<script setup lang="ts">
import type { LessonResponse, SubjectGradesResponse, SubjectLessonHeader, SubmissionStatus, TaskGradeResponse, TaskResponse } from '#shared/types/backend'
import type { TableColumn } from '@nuxt/ui'
import { h, resolveComponent } from 'vue'

interface Props {
  data: SubjectGradesResponse | null
  filteredLessons: SubjectLessonHeader[]
  tasksByLessonId: Record<string, TaskResponse[]>
  lessonsMap: Map<string, LessonResponse>
  loading?: boolean
}

const props = defineProps<Props>()

const UBadge = resolveComponent('UBadge')
const UTooltip = resolveComponent('UTooltip')

const SUBMISSION_STATUS_COLORS: Record<SubmissionStatus, string> = {
  NOT_SUBMITTED: 'neutral',
  SUBMITTED: 'info',
  GRADED: 'success',
  RESUBMIT: 'warning',
}

const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  NOT_SUBMITTED: 'Не сдано',
  SUBMITTED: 'Сдано',
  GRADED: 'Оценено',
  RESUBMIT: 'Доработка',
}

const gradeLookup = computed(() => {
  const map = new Map<string, TaskGradeResponse>()
  for (const grade of props.data?.grades ?? []) {
    map.set(`${grade.studentId}:${grade.taskId}`, grade)
  }
  return map
})

function getGrade(studentId: string, taskId: string): TaskGradeResponse | undefined {
  return gradeLookup.value.get(`${studentId}:${taskId}`)
}

function computeCoeff(lesson: LessonResponse | undefined, taskPosition: number): number {
  if (!lesson)
    return 1.0
  const d = lesson.issuedTaskIndex - taskPosition
  if (d <= 0)
    return 1.0
  switch (lesson.penaltyMode) {
    case 'SUBTRACT': return Math.max(0, 1 - lesson.penaltyStep * d)
    case 'MULTIPLY': return lesson.penaltyStep ** d
    default: return 1.0
  }
}

function lessonDateLabel(dateTime: string | null): string {
  if (!dateTime)
    return '—'
  return new Date(dateTime).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

const taskColumns = computed(() => {
  const cols: Array<{ lesson: SubjectLessonHeader, task: TaskResponse }> = []
  for (const lesson of props.filteredLessons) {
    for (const task of (props.tasksByLessonId[lesson.lessonId] ?? [])) {
      cols.push({ lesson, task })
    }
  }
  return cols
})

interface TasksRow {
  studentId: string
  username: string
  [key: string]: any
}

const rows = computed<TasksRow[]>(() => {
  const d = props.data
  if (!d)
    return []

  return d.students.map((student) => {
    const row: TasksRow = { studentId: student.id, username: student.username }
    for (const { lesson, task } of taskColumns.value) {
      const l = props.lessonsMap.get(lesson.lessonId)
      row[task.id] = {
        grade: getGrade(student.id, task.id),
        coeff: computeCoeff(l, task.position),
      }
    }
    return row
  })
})

const columns = computed<TableColumn<TasksRow>[]>(() => [
  {
    accessorKey: 'username',
    header: 'Студент',
    meta: {
      class: {
        th: 'w-48 min-w-48 sticky left-0 bg-default z-20',
        td: 'w-48 min-w-48 sticky left-0 bg-default z-10',
      },
    },
  },
  ...taskColumns.value.map(({ lesson, task }) => ({
    accessorKey: task.id,
    header: () => h('div', { class: 'flex flex-col items-center gap-0.5 text-center' }, [
      h('span', { class: 'text-[10px] text-muted truncate max-w-20' }, `${lesson.lessonName} · ${lessonDateLabel(lesson.dateTime)}`),
      h('div', { class: 'flex items-center justify-center gap-0.5' }, [
        h('span', { class: 'text-xs font-medium truncate max-w-16', title: task.title }, task.title),
        task.isMandatory
          ? h('span', { class: 'i-lucide-asterisk size-2.5 text-error shrink-0', title: 'Обязательное задание' })
          : null,
      ].filter(Boolean)),
      h('span', { class: 'text-[10px] text-muted' }, `${task.maxPoints}б`),
    ]),
    meta: { class: { th: 'min-w-20 text-center', td: 'min-w-20 text-center px-1 py-1' } },
    cell: ({ row }: any) => {
      const entry = row.original[task.id]
      if (!entry)
        return h('span', { class: 'text-muted text-sm' }, '—')
      const { grade, coeff } = entry as { grade: TaskGradeResponse | undefined, coeff: number }
      if (!grade)
        return h('span', { class: 'text-muted text-sm' }, '—')

      const displayValue = grade.value !== null
        ? String(Math.round(grade.value * coeff * 100) / 100)
        : '—'

      const tooltipParts = [
        SUBMISSION_STATUS_LABELS[grade.status as SubmissionStatus],
        grade.comment || null,
        coeff < 1 && grade.value !== null ? `Оригинал: ${grade.value}б` : null,
      ].filter(Boolean)

      return h(UTooltip, { text: tooltipParts.join(' · ') || undefined }, {
        default: () => h('div', { class: 'flex flex-col items-center gap-0.5' }, [
          h(UBadge, {
            label: displayValue,
            color: SUBMISSION_STATUS_COLORS[grade.status as SubmissionStatus],
            variant: 'soft',
            size: 'sm',
          }),
          coeff < 1 && grade.value !== null
            ? h('span', { class: 'text-[10px] text-muted line-through' }, String(grade.value))
            : null,
        ].filter(Boolean)),
      })
    },
  })),
])

const hasAnyTasks = computed(() => taskColumns.value.length > 0)
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap items-center gap-3">
      <UBadge label="Не сдано" color="neutral" variant="soft" size="sm" />
      <UBadge label="Сдано" color="info" variant="soft" size="sm" />
      <UBadge label="Оценено" color="success" variant="soft" size="sm" />
      <UBadge label="Доработка" color="warning" variant="soft" size="sm" />
      <span class="flex items-center gap-1 text-xs text-muted">
        <span class="i-lucide-asterisk size-2.5 text-error" />
        — обязательное задание
      </span>
    </div>

    <div class="overflow-x-auto rounded-md border border-default">
      <UTable
        :data="rows"
        :columns="columns"
        :loading="loading"
        sticky
        class="min-w-max"
      >
        <template #empty>
          <UEmpty
            icon="i-lucide-clipboard-list"
            :title="hasAnyTasks ? 'Нет данных' : 'Нет заданий'"
            :description="hasAnyTasks ? 'Оценки не проставлены.' : 'Для занятий выбранного типа заданий нет.'"
            variant="naked"
            class="py-12"
          />
        </template>
      </UTable>
    </div>
  </div>
</template>
