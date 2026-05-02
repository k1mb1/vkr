<script setup lang="ts">
import type { LessonResponse, SubjectGradesResponse, SubjectLessonHeader, TaskGradeResponse, TaskResponse } from '#shared/types/backend'
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
const UIcon = resolveComponent('UIcon')

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

const hasMandatoryTasks = computed(() =>
  props.filteredLessons.some(lesson =>
    (props.tasksByLessonId[lesson.lessonId] ?? []).some(t => t.isMandatory),
  ),
)

interface SummaryRow {
  studentId: string
  username: string
  [key: string]: any
}

const rows = computed<SummaryRow[]>(() => {
  const d = props.data
  if (!d)
    return []

  return d.students.map((student) => {
    const row: SummaryRow = { studentId: student.id, username: student.username }
    let mandatoryDone = 0
    let mandatoryTotal = 0

    for (const lessonHeader of props.filteredLessons) {
      const lesson = props.lessonsMap.get(lessonHeader.lessonId)
      const tasks = props.tasksByLessonId[lessonHeader.lessonId] ?? []
      let total = 0
      let max = 0

      for (const task of tasks) {
        const grade = getGrade(student.id, task.id)
        const coeff = computeCoeff(lesson, task.position)
        max += task.maxPoints * coeff
        if (grade?.value !== null && grade?.value !== undefined) {
          total += grade.value * coeff
        }
        if (task.isMandatory) {
          mandatoryTotal++
          if (grade && (grade.status === 'GRADED' || grade.status === 'SUBMITTED')) {
            mandatoryDone++
          }
        }
      }

      row[lessonHeader.lessonId] = {
        totalPoints: Math.round(total * 100) / 100,
        maxPoints: Math.round(max * 100) / 100,
      }
    }

    row.__mandatory = { done: mandatoryDone, total: mandatoryTotal }
    return row
  })
})

const columns = computed<TableColumn<SummaryRow>[]>(() => {
  const cols: TableColumn<SummaryRow>[] = [
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
    ...props.filteredLessons.map(lesson => ({
      accessorKey: lesson.lessonId,
      header: () => h('div', { class: 'flex flex-col items-center gap-0.5' }, [
        h('span', { class: 'text-xs font-medium' }, lesson.lessonName),
        h('span', { class: 'text-[10px] text-muted' }, lessonDateLabel(lesson.dateTime)),
      ]),
      meta: { class: { th: 'min-w-28 text-center', td: 'min-w-28 text-center py-1.5' } },
      cell: ({ row }: any) => {
        const cell = row.original[lesson.lessonId]
        if (!cell)
          return h('span', { class: 'text-muted text-sm' }, '—')
        const pct = cell.maxPoints > 0 ? cell.totalPoints / cell.maxPoints : null
        const color = pct === null ? 'neutral' : pct >= 0.8 ? 'success' : pct >= 0.5 ? 'warning' : 'error'
        const variant = cell.maxPoints === 0 ? 'subtle' : 'soft'
        return h(UBadge, {
          label: `${cell.totalPoints} / ${cell.maxPoints}б`,
          color,
          variant,
          size: 'sm',
        })
      },
    })),
  ]

  if (hasMandatoryTasks.value) {
    cols.push({
      accessorKey: '__mandatory',
      header: () => h('div', { class: 'flex flex-col items-center gap-0.5' }, [
        h(UIcon, { name: 'i-lucide-shield-check', class: 'size-3.5 text-muted' }),
        h('span', { class: 'text-xs font-medium' }, 'Обязательные'),
      ]),
      meta: { class: { th: 'min-w-28 text-center', td: 'min-w-28 text-center py-1.5' } },
      cell: ({ row }: any) => {
        const m = row.original.__mandatory
        if (!m || m.total === 0)
          return h('span', { class: 'text-muted text-sm' }, '—')
        const allDone = m.done === m.total
        return h(UBadge, {
          label: allDone ? 'Все сданы' : `${m.done} / ${m.total}`,
          color: allDone ? 'success' : 'error',
          variant: 'soft',
          size: 'sm',
        })
      },
    })
  }

  return cols
})
</script>

<template>
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
          icon="i-lucide-list-checks"
          title="Нет данных"
          description="Нет занятий для выбранного типа."
          variant="naked"
          class="py-12"
        />
      </template>
    </UTable>
  </div>
</template>
