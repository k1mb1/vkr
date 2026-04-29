<script setup lang="ts">
import type { LessonResponse, SubmissionStatus, TaskGradeResponse, TaskResponse } from '#shared/types/backend'
import { useLessonsApi } from '~/composables/api/useLessonsApi'
import { useSubjectsApi } from '~/composables/api/useSubjectsApi'

const route = useRoute()
const subjectId = computed(() => String(route.params.subjectId ?? ''))

const { findGrades } = useSubjectsApi()
const { findAll: findLessons } = useLessonsApi()

const { data: gradesData, pending: gradesPending, error: gradesError, refresh: refreshGrades } = findGrades(subjectId)
const { data: lessonsData, pending: lessonsPending } = findLessons({ subjectId: subjectId.value })

const tasksByLessonId = ref<Record<string, TaskResponse[]>>({})
const tasksLoading = ref(false)
const tasksError = ref<Error | null>(null)

watch([gradesData, lessonsData], async ([grades, _lessons]) => {
  if (!grades?.lessons?.length) {
    tasksByLessonId.value = {}
    return
  }
  const lessonIds = grades.lessons.map(l => l.lessonId)
  tasksLoading.value = true
  tasksError.value = null
  try {
    const results = await Promise.all(
      lessonIds.map(async (lessonId) => {
        const tasks = await $fetch<TaskResponse[]>('/api/proxy', {
          query: { path: `/lessons/${lessonId}/tasks` },
        })
        return { lessonId, tasks: tasks ?? [] }
      }),
    )
    tasksByLessonId.value = Object.fromEntries(results.map(r => [r.lessonId, r.tasks]))
  }
  catch (e) {
    tasksError.value = e instanceof Error ? e : new Error('Failed to load tasks')
  }
  finally {
    tasksLoading.value = false
  }
}, { immediate: true })

const rawLessons = computed<LessonResponse[]>(() => {
  const val = lessonsData.value as any
  if (Array.isArray(val)) return val
  if (val && Array.isArray(val.content)) return val.content as LessonResponse[]
  return []
})

const lessonsMap = computed(() => {
  const map = new Map<string, LessonResponse>()
  for (const lesson of rawLessons.value) {
    map.set(lesson.id, lesson)
  }
  return map
})

const gradeLookup = computed(() => {
  const map = new Map<string, TaskGradeResponse>()
  for (const grade of gradesData.value?.grades ?? []) {
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
    case 'SUBTRACT':
      return Math.max(0, 1 - lesson.penaltyStep * d)
    case 'MULTIPLY':
      return lesson.penaltyStep ** d
    default:
      return 1.0
  }
}

const SUBMISSION_STATUS_COLORS: Record<SubmissionStatus, 'neutral' | 'info' | 'success' | 'warning'> = {
  NOT_SUBMITTED: 'neutral',
  SUBMITTED: 'info',
  GRADED: 'success',
  RESUBMIT: 'warning',
}

interface LessonSummaryCell {
  totalPoints: number
  maxPoints: number
}

interface LessonSummaryRow {
  studentId: string
  username: string
  lessons: Record<string, LessonSummaryCell>
  mandatoryTotal: number
  mandatoryDone: number
  allMandatoryDone: boolean
}

const summaryRows = computed<LessonSummaryRow[]>(() => {
  const grades = gradesData.value
  if (!grades)
    return []

  return grades.students.map((student) => {
    const lessons: Record<string, LessonSummaryCell> = {}
    let mandatoryTotal = 0
    let mandatoryDone = 0

    for (const lessonHeader of grades.lessons ?? []) {
      const lesson = lessonsMap.value.get(lessonHeader.lessonId)
      const tasks = tasksByLessonId.value[lessonHeader.lessonId] ?? []
      let lessonTotal = 0
      let lessonMax = 0

      for (const task of tasks) {
        const grade = getGrade(student.id, task.id)
        const coeff = computeCoeff(lesson, task.position)
        lessonMax += task.maxPoints * coeff

        if (grade?.value !== null && grade?.value !== undefined) {
          lessonTotal += grade.value * coeff
        }

        if (task.isMandatory) {
          mandatoryTotal++
          if (grade && (grade.status === 'GRADED' || grade.status === 'SUBMITTED')) {
            mandatoryDone++
          }
        }
      }

      lessons[lessonHeader.lessonId] = {
        totalPoints: Math.round(lessonTotal * 100) / 100,
        maxPoints: Math.round(lessonMax * 100) / 100,
      }
    }

    return {
      studentId: student.id,
      username: student.username,
      lessons,
      mandatoryTotal,
      mandatoryDone,
      allMandatoryDone: mandatoryTotal === 0 || mandatoryDone === mandatoryTotal,
    }
  })
})

const summaryLessons = computed(() => {
  const grades = gradesData.value
  if (!grades)
    return []
  return grades.lessons ?? []
})

interface GradeCell {
  grade?: TaskGradeResponse
  task: TaskResponse
  lesson: LessonResponse | undefined
  coeff: number
}

interface GradeRow {
  studentId: string
  username: string
  cells: GradeCell[]
}

const tableRows = computed<GradeRow[]>(() => {
  const grades = gradesData.value
  if (!grades)
    return []
  const students = grades.students ?? []
  const lessons = grades.lessons ?? []
  return students.map((student) => {
    const cells: GradeCell[] = []
    for (const lessonHeader of lessons) {
      const lesson = lessonsMap.value.get(lessonHeader.lessonId)
      const tasks = tasksByLessonId.value[lessonHeader.lessonId] ?? []
      for (const task of tasks) {
        const grade = getGrade(student.id, task.id)
        const coeff = computeCoeff(lesson, task.position)
        cells.push({ grade, task, lesson, coeff })
      }
    }
    return { studentId: student.id, username: student.username, cells }
  })
})

const lessonSpans = computed(() => {
  const grades = gradesData.value
  if (!grades)
    return []
  const spans: Array<{ lessonId: string, lessonName: string, count: number, dateTime: string | null }> = []
  for (const lessonHeader of grades.lessons ?? []) {
    const tasks = tasksByLessonId.value[lessonHeader.lessonId] ?? []
    spans.push({
      lessonId: lessonHeader.lessonId,
      lessonName: lessonHeader.lessonName,
      count: tasks.length || 1,
      dateTime: lessonHeader.dateTime,
    })
  }
  return spans
})

const anyTasks = computed(() => Object.values(tasksByLessonId.value).some(t => t.length > 0))
const hasMandatoryTasks = computed(() =>
  Object.values(tasksByLessonId.value)
    .flat()
    .some(t => t.isMandatory),
)

const pending = computed(() => gradesPending.value || lessonsPending.value || tasksLoading.value)
</script>

<template>
  <section class="flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold">
        Оценки
      </h1>
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-lucide-refresh-cw"
        :loading="pending"
        @click="() => refreshGrades()"
      />
    </div>

    <UAlert
      v-if="gradesError"
      color="error"
      variant="soft"
      icon="i-lucide-circle-x"
      title="Ошибка загрузки"
      :description="gradesError.message"
    />

    <UAlert
      v-if="tasksError"
      color="warning"
      variant="soft"
      icon="i-lucide-alert-triangle"
      title="Ошибка загрузки заданий"
      :description="tasksError.message"
    />

    <div v-if="!gradesData?.students?.length && !pending" class="py-12">
      <UEmpty
        icon="i-lucide-list-checks"
        title="Нет данных об оценках"
        description="Добавьте занятия и задания, чтобы увидеть таблицу оценок."
        variant="naked"
      />
    </div>

    <template v-else-if="gradesData?.students?.length">
      <!-- Summary table by lessons -->
      <h2 class="text-lg font-semibold">
        По занятиям
      </h2>

      <div class="overflow-x-auto rounded-md border border-default">
        <table class="w-full text-sm">
          <thead class="bg-elevated/50">
            <tr>
              <th
                class="sticky left-0 z-20 min-w-48 border-b border-r border-default bg-elevated/95 px-3 py-2 text-left font-semibold backdrop-blur"
              >
                Студент
              </th>
              <th
                v-for="lesson in summaryLessons"
                :key="lesson.lessonId"
                class="border-b border-r border-default px-2 py-1.5 text-center text-xs font-medium"
              >
                <div class="flex flex-col items-center gap-0.5">
                  <span>{{ lesson.lessonName }}</span>
                  <span class="text-[10px] text-muted">{{ lesson.dateTime ? new Date(lesson.dateTime).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : '—' }}</span>
                </div>
              </th>
              <th
                v-if="hasMandatoryTasks"
                class="border-b border-default px-3 py-2 text-center text-xs font-medium"
              >
                Обязательные
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in summaryRows"
              :key="row.studentId"
              class="border-b border-default transition-colors hover:bg-elevated/30"
            >
              <td class="sticky left-0 z-10 min-w-48 border-r border-default bg-default/95 px-3 py-2 font-medium backdrop-blur">
                {{ row.username }}
              </td>
              <td
                v-for="lesson in summaryLessons"
                :key="lesson.lessonId"
                class="border-r border-default px-2 py-2 text-center"
              >
                <span class="tabular-nums">
                  {{ row.lessons[lesson.lessonId]?.totalPoints ?? 0 }} / {{ row.lessons[lesson.lessonId]?.maxPoints ?? 0 }}
                </span>
              </td>
              <td
                v-if="hasMandatoryTasks"
                class="border-default px-3 py-2 text-center"
              >
                <template v-if="row.mandatoryTotal > 0">
                  <UBadge
                    v-if="row.allMandatoryDone"
                    label="Все сданы"
                    color="success"
                    variant="soft"
                    size="sm"
                  />
                  <UBadge
                    v-else
                    :label="`${row.mandatoryDone} / ${row.mandatoryTotal}`"
                    color="error"
                    variant="soft"
                    size="sm"
                  />
                </template>
                <template v-else>
                  <span class="text-muted">—</span>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Detailed table by tasks -->
      <h2 class="text-lg font-semibold">
        По заданиям
      </h2>

      <div class="flex items-center gap-3 text-sm text-muted">
        <span class="flex items-center gap-1">
          <UBadge label="Не сдано" color="neutral" variant="soft" size="sm" />
        </span>
        <span class="flex items-center gap-1">
          <UBadge label="Сдано" color="info" variant="soft" size="sm" />
        </span>
        <span class="flex items-center gap-1">
          <UBadge label="Оценено" color="success" variant="soft" size="sm" />
        </span>
        <span class="flex items-center gap-1">
          <UBadge label="Доработка" color="warning" variant="soft" size="sm" />
        </span>
      </div>

      <div class="overflow-x-auto rounded-md border border-default">
        <table class="w-full text-sm">
          <thead class="bg-elevated/50">
            <!-- Lesson headers -->
            <tr>
              <th
                class="sticky left-0 z-20 min-w-48 border-b border-r border-default bg-elevated/95 px-3 py-2 text-left font-semibold backdrop-blur"
                rowspan="2"
              >
                Студент
              </th>
              <th
                v-for="span in lessonSpans"
                :key="span.lessonId"
                class="border-b border-r border-default px-2 py-1.5 text-center text-xs font-medium"
                :colspan="span.count"
              >
                <div class="flex flex-col items-center gap-0.5">
                  <span>{{ span.lessonName }}</span>
                  <span class="text-[10px] text-muted">{{ span.dateTime ? new Date(span.dateTime).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : '—' }}</span>
                </div>
              </th>
              <th v-if="!anyTasks && lessonSpans.length" class="border-b border-default px-2 py-1.5 text-center text-xs text-muted">
                Задания не загружены
              </th>
            </tr>
            <!-- Task headers -->
            <tr>
              <template v-for="span in lessonSpans" :key="span.lessonId">
                <th
                  v-for="task in tasksByLessonId[span.lessonId] ?? []"
                  :key="task.id"
                  class="border-b border-r border-default px-1.5 py-1 text-center text-[10px] font-medium text-muted"
                  :title="task.title"
                >
                  <div class="flex flex-col items-center">
                    <span class="max-w-16 truncate">{{ task.title }}</span>
                    <span class="text-[9px]">{{ task.maxPoints }}б</span>
                  </div>
                </th>
              </template>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in tableRows"
              :key="row.studentId"
              class="border-b border-default transition-colors hover:bg-elevated/30"
            >
              <td class="sticky left-0 z-10 min-w-48 border-r border-default bg-default/95 px-3 py-2 font-medium backdrop-blur">
                {{ row.username }}
              </td>
              <td
                v-for="(cell, idx) in row.cells"
                :key="idx"
                class="border-r border-default px-1.5 py-2 text-center"
              >
                <template v-if="cell.grade">
                  <UTooltip :text="cell.grade.comment || undefined">
                    <UBadge
                      :label="cell.grade.value !== null ? String(Math.round(cell.grade.value * cell.coeff * 100) / 100) : '—'"
                      :color="SUBMISSION_STATUS_COLORS[cell.grade.status]"
                      variant="soft"
                      size="sm"
                    />
                  </UTooltip>
                  <div v-if="cell.coeff < 1 && cell.grade.value !== null" class="text-[10px] text-muted line-through">
                    {{ cell.grade.value }}
                  </div>
                </template>
                <template v-else>
                  <span class="text-muted">—</span>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </section>
</template>
