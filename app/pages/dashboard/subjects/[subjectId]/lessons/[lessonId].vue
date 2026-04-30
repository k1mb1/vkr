<script setup lang="ts">
import type { LessonResponse, LessonType, SubmissionStatus, TaskGradeResponse, TaskResponse, UpdateIssuedTaskIndexRequestPayload } from '#shared/types/backend'
import { updateIssuedTaskIndexRequestSchema } from '#shared/types/backend'
import { useLessonsApi } from '~/composables/api/useLessonsApi'
import { useLessonTasksApi } from '~/composables/api/useLessonTasksApi'

const route = useRoute()
const subjectId = computed(() => String(route.params.subjectId ?? ''))
const lessonId = computed(() => String(route.params.lessonId ?? ''))

const { findAll, updateIssuedTaskIndex } = useLessonsApi()
const { findAll: findTasks, findGrades, upsertGrade } = useLessonTasksApi()

const { data: lessonsData, pending: lessonsPending, error: lessonsError, refresh: refreshLessons } = findAll({ filter: { subjectId: subjectId.value } })
const { data: tasksData, pending: tasksPending, error: tasksError, refresh: refreshTasks } = findTasks(lessonId)
const { data: gradesData, pending: gradesPending, error: gradesError, refresh: refreshGrades } = findGrades(lessonId)

const rawLessons = computed<LessonResponse[]>(() => {
  const val = lessonsData.value as any
  if (Array.isArray(val))
    return val
  if (val && Array.isArray(val.content))
    return val.content as LessonResponse[]
  return []
})

const lesson = computed<LessonResponse | null>(() =>
  rawLessons.value.find(l => l.id === lessonId.value) ?? null,
)

const notFound = computed(() => !lessonsPending.value && !lessonsError.value && lessonsData.value !== null && !lesson.value)

const tasks = computed<TaskResponse[]>(() => tasksData.value ?? [])
const grades = computed<TaskGradeResponse[]>(() => gradesData.value?.grades ?? [])
const students = computed(() => gradesData.value?.students ?? [])

const SUBMISSION_STATUS_COLORS: Record<SubmissionStatus, 'neutral' | 'info' | 'success' | 'warning'> = {
  NOT_SUBMITTED: 'neutral',
  SUBMITTED: 'info',
  GRADED: 'success',
  RESUBMIT: 'warning',
}

const LESSON_TYPE_LABELS: Record<LessonType, string> = {
  NONE: 'Без типа',
  LECTURE: 'Лекция',
  PRACTICE: 'Практика',
}

const LESSON_TYPE_COLORS: Record<LessonType, 'neutral' | 'primary' | 'secondary'> = {
  NONE: 'neutral',
  LECTURE: 'primary',
  PRACTICE: 'secondary',
}

function formatDateTime(dt: string | null): string {
  if (!dt)
    return '—'
  return new Date(dt).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })
}

function formatDate(dt: string): string {
  return new Date(dt).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })
}

// ── Issued task index form ────────────────────────────────────────────────────

const toast = useToast()
const issuedTaskIndexPending = ref(false)
const issuedTaskIndexState = reactive<UpdateIssuedTaskIndexRequestPayload>({ issuedTaskIndex: 0 })

watch(lesson, (val) => {
  if (val)
    issuedTaskIndexState.issuedTaskIndex = val.issuedTaskIndex
}, { immediate: true })

function getErrorMessage(e: unknown): string {
  if (e instanceof Error)
    return e.message
  const err = e as { data?: { statusMessage?: string, message?: string }, message?: string }
  return err.data?.statusMessage || err.data?.message || err.message || 'Что-то пошло не так'
}

async function onSaveIssuedTaskIndex(event: { data: UpdateIssuedTaskIndexRequestPayload }) {
  if (issuedTaskIndexPending.value)
    return
  issuedTaskIndexPending.value = true
  try {
    const { data: updated, error: err } = await updateIssuedTaskIndex(lessonId, event.data)
    if (err.value || !updated.value)
      throw err.value || new Error('Нет ответа от сервера')
    toast.add({ title: 'Индекс выданного задания обновлён', color: 'success', icon: 'i-lucide-check' })
    await refreshLessons()
  }
  catch (e) {
    toast.add({ title: 'Ошибка', description: getErrorMessage(e), color: 'error', icon: 'i-lucide-circle-alert' })
  }
  finally {
    issuedTaskIndexPending.value = false
  }
}

// ── Grade editing ─────────────────────────────────────────────────────────────

const editingGrade = ref<{ studentId: string, taskId: string, value: number | null, status: SubmissionStatus } | null>(null)
const gradePending = ref(false)

const isGradeEditOpen = computed({
  get: () => !!editingGrade.value,
  set: (val) => {
    if (!val)
      editingGrade.value = null
  },
})

function openGradeEdit(studentId: string, taskId: string) {
  const grade = grades.value.find(g => g.studentId === studentId && g.taskId === taskId)
  editingGrade.value = {
    studentId,
    taskId,
    value: grade?.value ?? null,
    status: grade?.status ?? 'NOT_SUBMITTED',
  }
}

function closeGradeEdit() {
  editingGrade.value = null
}

async function onSaveGrade() {
  if (!editingGrade.value || gradePending.value)
    return
  gradePending.value = true
  try {
    const { error: err } = await upsertGrade(lessonId, editingGrade.value.taskId, {
      studentId: editingGrade.value.studentId,
      value: editingGrade.value.value,
      status: editingGrade.value.status,
    })
    if (err.value)
      throw err.value
    toast.add({ title: 'Оценка сохранена', color: 'success', icon: 'i-lucide-check' })
    closeGradeEdit()
    await refreshGrades()
  }
  catch (e) {
    toast.add({ title: 'Ошибка', description: getErrorMessage(e), color: 'error', icon: 'i-lucide-circle-alert' })
  }
  finally {
    gradePending.value = false
  }
}

const gradeRows = computed(() => {
  return students.value.map((student) => {
    const taskGrades = tasks.value.map((task) => {
      const grade = grades.value.find(g => g.studentId === student.id && g.taskId === task.id)
      return { task, grade }
    })
    return { student, taskGrades }
  })
})
</script>

<template>
  <section class="flex flex-col gap-6">
    <div class="flex items-center gap-3">
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-lucide-arrow-left"
        :to="`/dashboard/subjects/${subjectId}/lessons`"
      />
      <div v-if="lessonsPending && !lesson" class="flex gap-3 items-center">
        <USkeleton class="h-7 w-48" />
        <USkeleton class="h-5 w-16 rounded-full" />
      </div>
      <template v-else-if="lesson">
        <h1 class="text-xl font-semibold">
          {{ lesson.name }}
        </h1>
        <UBadge
          :label="LESSON_TYPE_LABELS[lesson.type]"
          :color="LESSON_TYPE_COLORS[lesson.type]"
          variant="soft"
        />
      </template>
    </div>

    <UAlert
      v-if="lessonsError"
      color="error"
      variant="soft"
      icon="i-lucide-circle-x"
      title="Ошибка загрузки"
      :description="lessonsError.message"
    />

    <UEmpty
      v-else-if="notFound"
      icon="i-lucide-search-x"
      title="Занятие не найдено"
      description="Проверьте ссылку или вернитесь к списку занятий."
      variant="naked"
    />

    <template v-else-if="lesson">
      <!-- Info card -->
      <UCard>
        <template #header>
          <h2 class="font-semibold">
            Информация
          </h2>
        </template>

        <dl class="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt class="text-sm text-muted">
              Тип
            </dt>
            <dd class="mt-0.5">
              <UBadge :label="LESSON_TYPE_LABELS[lesson.type]" :color="LESSON_TYPE_COLORS[lesson.type]" variant="soft" size="sm" />
            </dd>
          </div>
          <div>
            <dt class="text-sm text-muted">
              Дата и время
            </dt>
            <dd class="mt-0.5 text-sm">
              {{ formatDateTime(lesson.dateTime) }}
            </dd>
          </div>
          <div>
            <dt class="text-sm text-muted">
              Режим выдачи
            </dt>
            <dd class="mt-0.5 text-sm">
              {{ lesson.issuanceMode }}
            </dd>
          </div>
          <div>
            <dt class="text-sm text-muted">
              Текущий индекс задания
            </dt>
            <dd class="mt-0.5 text-sm">
              {{ lesson.issuedTaskIndex }}
            </dd>
          </div>
          <div>
            <dt class="text-sm text-muted">
              Штраф
            </dt>
            <dd class="mt-0.5 text-sm">
              {{ lesson.penaltyMode }} ({{ lesson.penaltyStep }})
            </dd>
          </div>
          <div>
            <dt class="text-sm text-muted">
              Выдано
            </dt>
            <dd class="mt-0.5 text-sm">
              {{ lesson.issuedAt ? formatDate(lesson.issuedAt) : '—' }}
            </dd>
          </div>
        </dl>
      </UCard>

      <!-- Issued task index -->
      <UCard>
        <template #header>
          <div>
            <h2 class="font-semibold">
              Индекс выданного задания
            </h2>
            <p class="mt-0.5 text-sm text-muted">
              Управляет смещением относительно позиции задания и влияет на коэффициент штрафа.
            </p>
          </div>
        </template>
        <UForm
          :schema="updateIssuedTaskIndexRequestSchema"
          :state="issuedTaskIndexState"
          class="flex items-end gap-3"
          @submit="onSaveIssuedTaskIndex"
        >
          <UFormField name="issuedTaskIndex" label="Индекс (>= 0)" class="w-48">
            <UInput
              v-model.number="issuedTaskIndexState.issuedTaskIndex"
              type="number"
              :min="0"
              :step="1"
              :disabled="issuedTaskIndexPending"
              class="w-full"
            />
          </UFormField>
          <UButton type="submit" icon="i-lucide-check" :loading="issuedTaskIndexPending" :disabled="issuedTaskIndexPending">
            Сохранить
          </UButton>
        </UForm>
      </UCard>

      <!-- Tasks list -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <h2 class="font-semibold">
                Задания
              </h2>
              <p class="mt-0.5 text-sm text-muted">
                {{ tasks.length }} задани{{ tasks.length === 1 ? 'е' : tasks.length > 1 && tasks.length < 5 ? 'я' : 'й' }}
              </p>
            </div>
          </div>
        </template>

        <UAlert
          v-if="tasksError"
          color="error"
          variant="soft"
          title="Ошибка загрузки заданий"
          :description="tasksError.message"
        />

        <div v-if="tasksPending && !tasks.length" class="space-y-2">
          <USkeleton v-for="i in 3" :key="i" class="h-12" />
        </div>

        <div v-else-if="!tasks.length" class="py-6">
          <UEmpty icon="i-lucide-list-checks" title="Нет заданий" description="Добавьте задания к этому занятию." variant="naked" />
        </div>

        <div v-else class="divide-y divide-default">
          <div
            v-for="(task, idx) in tasks"
            :key="task.id"
            class="flex items-center justify-between py-3"
            :class="{ 'opacity-60': task.position < lesson.issuedTaskIndex }"
          >
            <div class="flex items-center gap-3">
              <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {{ idx + 1 }}
              </div>
              <div>
                <p class="font-medium">
                  {{ task.title }}
                </p>
                <p class="text-xs text-muted">
                  {{ task.maxPoints }} баллов {{ task.isMandatory ? '' : '(бонусное)' }} {{ task.deadline ? `· дедлайн ${new Date(task.deadline).toLocaleDateString('ru-RU')}` : '' }}
                </p>
              </div>
            </div>
            <UBadge v-if="task.position < lesson.issuedTaskIndex" label="Выдано" color="success" variant="soft" size="sm" />
            <UBadge v-else label="Не выдано" color="neutral" variant="soft" size="sm" />
          </div>
        </div>
      </UCard>

      <!-- Grades matrix -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <h2 class="font-semibold">
                Оценки студентов
              </h2>
              <p class="mt-0.5 text-sm text-muted">
                Кликните по ячейке чтобы изменить оценку
              </p>
            </div>
            <UButton color="neutral" variant="ghost" icon="i-lucide-refresh-cw" :loading="gradesPending" @click="() => refreshGrades()" />
          </div>
        </template>

        <UAlert
          v-if="gradesError"
          color="error"
          variant="soft"
          title="Ошибка загрузки оценок"
          :description="gradesError.message"
        />

        <div v-if="gradesPending && !students.length" class="space-y-2">
          <USkeleton v-for="i in 5" :key="i" class="h-10" />
        </div>

        <div v-else-if="!students.length" class="py-6">
          <UEmpty icon="i-lucide-users" title="Нет студентов" description="В предмете пока нет студентов." variant="naked" />
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-elevated/50">
              <tr>
                <th class="sticky left-0 z-10 min-w-40 border-b border-r border-default bg-elevated/95 px-3 py-2 text-left font-semibold backdrop-blur">
                  Студент
                </th>
                <th
                  v-for="task in tasks"
                  :key="task.id"
                  class="border-b border-r border-default px-2 py-1.5 text-center text-xs font-medium"
                >
                  {{ task.title }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in gradeRows"
                :key="row.student.id"
                class="border-b border-default transition-colors hover:bg-elevated/30"
              >
                <td class="sticky left-0 z-10 border-r border-default bg-default/95 px-3 py-2 font-medium backdrop-blur">
                  {{ row.student.username }}
                </td>
                <td
                  v-for="tg in row.taskGrades"
                  :key="tg.task.id"
                  class="border-r border-default px-1.5 py-2 text-center cursor-pointer"
                  @click="openGradeEdit(row.student.id, tg.task.id)"
                >
                  <template v-if="tg.grade">
                    <UBadge
                      :label="tg.grade.value !== null ? String(tg.grade.value) : '—'"
                      :color="SUBMISSION_STATUS_COLORS[tg.grade.status]"
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
      </UCard>
    </template>

    <template v-else-if="lessonsPending">
      <UCard>
        <template #header>
          <USkeleton class="h-5 w-24" />
        </template>
        <div class="grid grid-cols-2 gap-4">
          <USkeleton v-for="i in 6" :key="i" class="h-10" />
        </div>
      </UCard>
    </template>

    <!-- Grade edit modal -->
    <UModal v-model:open="isGradeEditOpen" title="Изменить оценку">
      <template #body>
        <div v-if="editingGrade" class="flex flex-col gap-4">
          <UFormField label="Баллы">
            <UInput v-model.number="editingGrade.value" type="number" :min="0" class="w-full" />
          </UFormField>
          <UFormField label="Статус">
            <USelect
              v-model="editingGrade.status"
              :items="[
                { label: 'Не сдано', value: 'NOT_SUBMITTED' },
                { label: 'Сдано', value: 'SUBMITTED' },
                { label: 'Оценено', value: 'GRADED' },
                { label: 'На доработку', value: 'RESUBMIT' },
              ]"
              class="w-full"
            />
          </UFormField>
          <div class="flex justify-end gap-2">
            <UButton color="neutral" variant="soft" @click="closeGradeEdit">
              Отмена
            </UButton>
            <UButton icon="i-lucide-check" :loading="gradePending" :disabled="gradePending" @click="onSaveGrade">
              Сохранить
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </section>
</template>
