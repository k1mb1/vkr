<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { CheckInSessionResponse, LessonResponse, LessonScopeResponse } from '#hey-api'

type CheckInState = NonNullable<CheckInSessionResponse['state']>

const props = defineProps<{
  subjectId: string
  lessonId: string
  lesson: LessonResponse | null
  sessions: CheckInSessionResponse[]
  hasAllPermissions: boolean
}>()

const { d } = useI18n()

type StepStatus = 'done' | 'todo' | 'progress'

interface Step {
  key: string
  label: string
  hint: string
  status: StepStatus
  action?: { label: string, icon: string, to: string, color?: 'primary' | 'neutral' }
  /** Несколько проведений — выбор конкретного делаем прямо здесь через меню. */
  menu?: { label: string, icon: string, color?: 'primary' | 'neutral', items: DropdownMenuItem[] }
}

const ACTIVE_STATES: CheckInState[] = ['OPEN', 'LATE_WINDOW', 'AWAITING_CONFIRMATION']

const hasScopes = computed(() => (props.lesson?.scopes?.length ?? 0) > 0)
const hasAssignments = computed(() => (props.lesson?.assignments?.length ?? 0) > 0)

const createBase = computed(() => `/dashboard/subjects/${props.subjectId}/check-ins/create`)

// Проведения, по которым ещё нет не отменённой сессии — их можно запускать.
const launchableScopes = computed<LessonScopeResponse[]>(() => {
  const taken = new Set<string>()
  for (const s of props.sessions) {
    if (s.lessonId === props.lessonId && s.lessonScopeId && s.state !== 'CANCELLED')
      taken.add(s.lessonScopeId)
  }
  return (props.lesson?.scopes ?? []).filter(s => s.id && !taken.has(s.id))
})

function scopeLabel(s: LessonScopeResponse): string {
  const parts: string[] = []
  if (s.startedAt)
    parts.push(d(new Date(s.startedAt), 'numeric'))
  if (s.allGroups) {
    parts.push('Все группы')
  }
  else {
    parts.push(s.groupName ?? '—')
    if (s.allowedSubgroupIndex != null)
      parts.push(`Подгр. ${s.allowedSubgroupIndex}`)
  }
  return parts.join(' · ')
}

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
    const scopes = launchableScopes.value
    const step: Step = {
      key: 'checkin',
      label: 'Отметка присутствия',
      hint: !hasScopes.value
        ? 'Сначала назначьте проведение занятия'
        : scopes.length > 1
          ? 'У занятия несколько проведений — выберите, какое запустить'
          : 'Запустите опрос — студенты отметятся по QR-коду',
      status: 'todo',
    }

    if (hasScopes.value && scopes.length > 1) {
      // Несколько проведений (разные даты/группы) — даём выбор прямо на карточке,
      // чтобы на форме запуска нужное проведение было уже предвыбрано.
      step.menu = {
        label: 'Запустить',
        icon: 'i-lucide-qr-code',
        color: 'primary',
        items: scopes.map(s => ({
          label: scopeLabel(s),
          icon: 'i-lucide-qr-code',
          to: `${createBase.value}?lessonScopeId=${s.id}`,
        })),
      }
    }
    else if (hasScopes.value) {
      // Ровно одно проведение (или все, если сессий ещё нет) — запускаем сразу с
      // предвыбором конкретного проведения, а не занятия целиком.
      const only = scopes[0]
      step.action = {
        label: 'Запустить',
        icon: 'i-lucide-qr-code',
        to: only?.id
          ? `${createBase.value}?lessonScopeId=${only.id}`
          : `${createBase.value}?lessonId=${props.lessonId}`,
        color: 'primary',
      }
    }

    list.push(step)
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
        <UDropdownMenu
          v-if="step.menu"
          :items="step.menu.items"
          :content="{ align: 'end' }"
          :ui="{ content: 'w-64' }"
        >
          <UButton
            :icon="step.menu.icon"
            :label="step.menu.label"
            trailing-icon="i-lucide-chevron-down"
            :color="step.menu.color ?? 'neutral'"
            variant="subtle"
            size="xs"
            class="shrink-0"
          />
        </UDropdownMenu>
        <UButton
          v-else-if="step.action"
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
