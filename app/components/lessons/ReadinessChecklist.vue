<script setup lang="ts">
import type { CheckInSessionResponse, LessonResponse } from '#hey-api'

type CheckInState = NonNullable<CheckInSessionResponse['state']>

const props = defineProps<{
  subjectId: string
  lessonId: string
  lesson: LessonResponse | null
  sessions: CheckInSessionResponse[]
  hasAllPermissions: boolean
}>()

type StepStatus = 'done' | 'todo' | 'progress'

interface Step {
  key: string
  label: string
  hint: string
  status: StepStatus
  action?: { label: string, icon: string, to: string, color?: 'primary' | 'neutral' }
}

const ACTIVE_STATES: CheckInState[] = ['OPEN', 'LATE_WINDOW', 'AWAITING_CONFIRMATION']

const hasScopes = computed(() => (props.lesson?.scopes?.length ?? 0) > 0)
const hasAssignments = computed(() => (props.lesson?.assignments?.length ?? 0) > 0)

// Сессии этого занятия — матчим по lessonId (бэкенд отдаёт его в сессии).
const lessonSessions = computed(() =>
  props.sessions.filter(s => s.lessonId === props.lessonId),
)

const confirmedSession = computed(() =>
  lessonSessions.value.find(s => s.state === 'CONFIRMED') ?? null,
)

const activeSession = computed(() =>
  lessonSessions.value.find(s => s.state && ACTIVE_STATES.includes(s.state)) ?? null,
)

const checkInBase = computed(() => `/dashboard/subjects/${props.subjectId}/check-ins`)

const steps = computed<Step[]>(() => {
  const list: Step[] = []

  list.push({
    key: 'scopes',
    label: 'Проведение назначено',
    hint: 'Группы, подгруппы и даты, когда занятие проводится',
    status: hasScopes.value ? 'done' : 'todo',
    action: !hasScopes.value && props.hasAllPermissions
      ? {
          label: 'Назначить',
          icon: 'i-lucide-calendar-plus',
          to: `/dashboard/subjects/${props.subjectId}/lessons/${props.lessonId}/scopes-create`,
          color: 'primary',
        }
      : undefined,
  })

  list.push({
    key: 'assignments',
    label: 'Задания добавлены',
    hint: 'Нужны для выставления оценок по занятию',
    status: hasAssignments.value ? 'done' : 'todo',
    action: !hasAssignments.value && props.hasAllPermissions
      ? {
          label: 'Добавить',
          icon: 'i-lucide-clipboard-list',
          to: `/dashboard/subjects/${props.subjectId}/lessons/${props.lessonId}/assignments-create`,
          color: 'neutral',
        }
      : undefined,
  })

  if (confirmedSession.value) {
    list.push({
      key: 'checkin',
      label: 'Отметка проведена, посещаемость перенесена',
      hint: 'Результаты отметки уже в таблице посещаемости',
      status: 'done',
      action: {
        label: 'Открыть сессию',
        icon: 'i-lucide-arrow-right',
        to: `${checkInBase.value}/${confirmedSession.value.id}`,
        color: 'neutral',
      },
    })
  }
  else if (activeSession.value) {
    list.push({
      key: 'checkin',
      label: 'Идёт отметка присутствия',
      hint: 'Сессия запущена — подтвердите результаты после закрытия',
      status: 'progress',
      action: {
        label: 'К сессии',
        icon: 'i-lucide-arrow-right',
        to: `${checkInBase.value}/${activeSession.value.id}`,
        color: 'primary',
      },
    })
  }
  else {
    list.push({
      key: 'checkin',
      label: 'Отметка присутствия',
      hint: hasScopes.value
        ? 'Запустите опрос — студенты отметятся по QR-коду'
        : 'Сначала назначьте проведение занятия',
      status: 'todo',
      action: hasScopes.value
        ? {
            label: 'Запустить',
            icon: 'i-lucide-qr-code',
            to: `${checkInBase.value}/create?lessonId=${props.lessonId}`,
            color: 'primary',
          }
        : undefined,
    })
  }

  return list
})

const doneCount = computed(() => steps.value.filter(s => s.status === 'done').length)
const allDone = computed(() => doneCount.value === steps.value.length)

function statusIcon(status: StepStatus): string {
  if (status === 'done')
    return 'i-lucide-circle-check'
  if (status === 'progress')
    return 'i-lucide-loader'
  return 'i-lucide-circle-dashed'
}

function statusClass(status: StepStatus): string {
  if (status === 'done')
    return 'text-success'
  if (status === 'progress')
    return 'text-primary'
  return 'text-muted'
}
</script>

<template>
  <UCard
    variant="subtle"
    :ui="{ body: 'p-4 sm:p-4' }"
  >
    <div class="flex items-center gap-2 mb-3">
      <UIcon
        :name="allDone ? 'i-lucide-circle-check-big' : 'i-lucide-list-checks'"
        class="size-5"
        :class="allDone ? 'text-success' : 'text-primary'"
      />
      <h3 class="text-sm font-semibold text-highlighted">
        Готовность занятия
      </h3>
      <UBadge
        :color="allDone ? 'success' : 'neutral'"
        variant="subtle"
        :label="`${doneCount} из ${steps.length}`"
        class="ml-auto"
      />
    </div>

    <ul class="flex flex-col divide-y divide-default">
      <li
        v-for="step in steps"
        :key="step.key"
        class="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
      >
        <UIcon
          :name="statusIcon(step.status)"
          class="size-5 shrink-0"
          :class="[statusClass(step.status), step.status === 'progress' ? 'animate-spin' : '']"
        />
        <div class="min-w-0 flex-1">
          <p
            class="text-sm font-medium"
            :class="step.status === 'done' ? 'text-muted line-through' : 'text-default'"
          >
            {{ step.label }}
          </p>
          <p class="text-xs text-muted">
            {{ step.hint }}
          </p>
        </div>
        <UButton
          v-if="step.action"
          :icon="step.action.icon"
          :label="step.action.label"
          :to="step.action.to"
          :color="step.action.color ?? 'neutral'"
          variant="subtle"
          size="xs"
          class="shrink-0"
        />
      </li>
    </ul>
  </UCard>
</template>
