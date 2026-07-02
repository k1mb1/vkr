<script setup lang="ts">
import type { LessonResponse, LessonScopeResponse, StartCheckInRequest } from '#hey-api'
import type { SchemaFor } from '~/utils/validation'
import * as v from 'valibot'
import { getCheckInPolicy, getLessons, list, start } from '#hey-api'
import { string } from '~/utils/validation'

interface LessonScopeOption {
  value: string
  label: string
  lesson: LessonResponse
  scope: LessonScopeResponse
}

type StartCheckInForm = Omit<StartCheckInRequest, 'onTimeSeconds' | 'lateSeconds'> & {
  onTimeMinutes: number
  lateMinutes: number
}

const StartCheckInSchema: SchemaFor<StartCheckInForm> = v.object({
  lessonScopeId: string('Выберите проведение занятия'),
  onTimeMinutes: v.pipe(
    v.number('Длительность основного окна — минимум 1 минута'),
    v.integer('Длительность основного окна — целое число минут'),
    v.minValue(1, 'Длительность основного окна — минимум 1 минута'),
  ),
  lateMinutes: v.pipe(
    v.number('Окно для опоздавших не может быть отрицательным'),
    v.integer('Окно для опоздавших — целое число минут'),
    v.minValue(0, 'Окно для опоздавших не может быть отрицательным'),
  ),
})

const route = useRoute()
const subjectId = String(route.params.uuid ?? '')

const { d } = useI18n()

// Единая политика окон предмета. Если включена — окна берутся из неё,
// а поля формы игнорируются бэкендом и не отправляются.
const { data: policyData } = useApi(
  { key: `check-in-policy:${subjectId}` },
  () => getCheckInPolicy({ path: { subjectId } }),
)

const policyEnabled = computed(() => policyData.value?.enabled === true)
const policyOnTimeMinutes = computed(() =>
  policyData.value?.onTimeSeconds != null ? Math.round(policyData.value.onTimeSeconds / 60) : null,
)
const policyLateMinutes = computed(() =>
  policyData.value?.lateSeconds != null ? Math.round(policyData.value.lateSeconds / 60) : null,
)

const { permission, permissionId, hasAllPermissions, pending: permissionPending } = usePermissions()

const { data: lessonsData, pending: lessonsPending, refresh } = useApi(
  { key: `check-in-lessons:${subjectId}`, immediate: false },
  () => getLessons({ query: { permissionId: permissionId.value } }),
)

// Существующие сессии — чтобы не предлагать уже отмеченные (или идущие) проведения.
const { data: sessionsData, refresh: refreshSessions } = useApi(
  { key: `check-in-sessions:${subjectId}`, immediate: false },
  () => list({ query: { permissionId: permissionId.value } }),
)

useRefreshOnPermission(permissionId, () => {
  refresh()
  refreshSessions()
})

// lessonScopeId проведений, по которым уже есть не отменённая сессия
// (подтверждённая или ещё идущая) — их исключаем из выбора.
const takenScopeIds = computed(() => {
  const taken = new Set<string>()
  for (const s of sessionsData.value ?? []) {
    if (s.lessonScopeId && s.state !== 'CANCELLED')
      taken.add(s.lessonScopeId)
  }
  return taken
})

function formatScopeAudience(s: LessonScopeResponse): string {
  if (s.allGroups)
    return 'Все группы'
  const parts: string[] = [s.groupName ?? '—']
  if (s.allowedSubgroupIndex != null)
    parts.push(`Подгруппа ${s.allowedSubgroupIndex}`)
  return parts.join(' · ')
}

function formatScopeOption(l: LessonResponse, s: LessonScopeResponse): string {
  const parts: string[] = []
  if (s.startedAt)
    parts.push(d(new Date(s.startedAt), 'numeric'))
  parts.push(l.type === 'LECTURE' ? 'Лекция' : 'Практика')
  parts.push(formatScopeAudience(s))
  if (l.topic)
    parts.push(l.topic)
  return parts.join(' · ')
}

const scopeOptions = computed<LessonScopeOption[]>(() => {
  const out: LessonScopeOption[] = []
  for (const l of lessonsData.value ?? []) {
    for (const s of l.scopes ?? []) {
      if (!s.id || takenScopeIds.value.has(s.id))
        continue
      out.push({
        value: s.id,
        label: formatScopeOption(l, s),
        lesson: l,
        scope: s,
      })
    }
  }
  out.sort((a, b) => {
    const at = a.scope.startedAt ? new Date(a.scope.startedAt).getTime() : 0
    const bt = b.scope.startedAt ? new Date(b.scope.startedAt).getTime() : 0
    return bt - at
  })
  return out
})

const { state, formRef, loading, onSubmit, onError } = useResourceForm<typeof StartCheckInSchema>({
  initialState: () => ({ lessonScopeId: '', onTimeMinutes: 5, lateMinutes: 5 }),
  successMessage: 'Опрос запущен',
})

// Переход с карточки занятия (`?lessonId=`) — предвыбираем проведение, если
// для этого занятия доступно ровно одно (при нескольких оставляем выбор за
// преподавателем, чтобы не отметить не ту группу/дату).
const preselectLessonId = computed(() => {
  const q = route.query.lessonId
  return typeof q === 'string' ? q : null
})

watch(scopeOptions, (opts) => {
  if (state.lessonScopeId || !preselectLessonId.value)
    return
  const matching = opts.filter(o => o.lesson.id === preselectLessonId.value)
  if (matching.length === 1)
    state.lessonScopeId = matching[0]!.value
}, { immediate: true })

const selectedScopeOption = computed({
  get: () => scopeOptions.value.find(o => o.value === state.lessonScopeId),
  set: (val) => {
    state.lessonScopeId = val?.value ?? ''
  },
})

const selectedScope = computed<LessonScopeResponse | undefined>(() =>
  scopeOptions.value.find(o => o.value === state.lessonScopeId)?.scope,
)

const handleStart = onSubmit(
  (data) => {
    const body: StartCheckInRequest = {
      lessonScopeId: data.lessonScopeId,
      // При включённой политике предмета окна берутся из неё — не отправляем.
      ...(policyEnabled.value
        ? {}
        : {
            onTimeSeconds: data.onTimeMinutes * 60,
            lateSeconds: data.lateMinutes * 60,
          }),
    }
    return start({ body })
  },
  {
    onSuccess: (result) => {
      navigateTo(`/dashboard/subjects/${subjectId}/check-ins/${result?.id}`)
    },
  },
)
</script>

<template>
  <div class="flex flex-col gap-6">
    <UPageHeader title="Запустить отметку присутствия">
      <template #links>
        <UButton
          :to="`/dashboard/subjects/${subjectId}/check-ins`"
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="ghost"
          label="Назад"
        />
      </template>
    </UPageHeader>

    <div v-if="permissionPending" class="flex flex-col gap-4">
      <USkeleton v-for="i in 3" :key="i" class="h-12" />
    </div>

    <UAlert
      v-else-if="!permission"
      color="warning"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Нет назначения"
      description="У вас нет назначения по данному предмету."
    />

    <UForm
      v-else
      ref="formRef"
      :schema="StartCheckInSchema"
      :state="state"
      class="flex flex-col gap-4"
      @submit="handleStart"
      @error="onError"
    >
      <UAlert
        color="neutral"
        variant="soft"
        icon="i-lucide-info"
        title="Как проходит отметка"
        description="Запуск открывает окно, в течение которого студенты выбранного проведения отмечаются по QR-коду. Отметившиеся в основном окне получают «Присутствовал», в окне для опоздавших — «Опоздал». Аудитория берётся из проведения занятия."
      />

      <UFormField label="Проведение занятия" name="lessonScopeId" required>
        <USelectMenu
          v-model="selectedScopeOption"
          :items="scopeOptions"
          :loading="lessonsPending"
          :disabled="lessonsPending || scopeOptions.length === 0"
          placeholder="Выберите проведение занятия..."
          class="w-full"
        />
        <template v-if="!lessonsPending && scopeOptions.length === 0" #help>
          Нет доступных проведений: все занятия уже отмечены либо проведение ещё не назначено.
        </template>
      </UFormField>

      <UFormField v-if="selectedScope" label="Аудитория">
        <UInput
          :model-value="formatScopeAudience(selectedScope)"
          disabled
          class="w-full"
        />
        <template #help>
          Аудитория опроса берётся из проведения
        </template>
      </UFormField>

      <UAlert
        v-if="policyEnabled"
        color="info"
        variant="soft"
        icon="i-lucide-timer"
        title="Используются единые окна предмета"
      >
        <template #description>
          Основное окно: <b>{{ policyOnTimeMinutes ?? '—' }} мин</b>,
          для опоздавших: <b>{{ policyLateMinutes ?? '—' }} мин</b>.
          <template v-if="hasAllPermissions">
            Изменить можно в настройках предмета → «Единое время на отметку».
          </template>
          <template v-else>
            Чтобы изменить окна, обратитесь к ответственному за предмет.
          </template>
        </template>
      </UAlert>

      <div v-else class="grid gap-4 sm:grid-cols-2">
        <UFormField label="Основное окно (минуты)" name="onTimeMinutes" required>
          <UInput
            v-model.number="state.onTimeMinutes"
            type="number"
            :min="1"
            class="w-full"
          />
          <template #help>
            Студенты, отметившиеся здесь, получат статус «Присутствовал»
          </template>
        </UFormField>

        <UFormField label="Окно для опоздавших (минуты)" name="lateMinutes">
          <UInput
            v-model.number="state.lateMinutes"
            type="number"
            :min="0"
            class="w-full"
          />
          <template #help>
            Отметившиеся здесь получат статус «Опоздал»
          </template>
        </UFormField>
      </div>

      <UButton
        type="submit"
        icon="i-lucide-play"
        :loading="loading"
        :disabled="scopeOptions.length === 0"
        class="ml-auto"
      >
        Запустить опрос
      </UButton>
    </UForm>
  </div>
</template>
