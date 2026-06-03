<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'
import type { SchemaFor } from '~/utils/validation'
import * as v from 'valibot'
import { string } from '~/utils/validation'

type StartCheckInRequest = components['schemas']['StartCheckInRequest']
type LessonResponse = components['schemas']['LessonResponse']
type LessonScopeResponse = components['schemas']['LessonScopeResponse']

interface LessonScopeOption {
  value: string
  label: string
  lesson: LessonResponse
  scope: LessonScopeResponse
}

interface StartCheckInForm {
  lessonScopeId: string
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

const { $backend } = useNuxtApp()
const { d } = useI18n()

const { permission, permissionId, pending: permissionPending } = usePermissions()

const { data: lessonsData, pending: lessonsPending, refresh } = useBackend('/api/lessons', {
  method: 'GET',
  query: computed(() => ({ permissionId: permissionId.value })),
  immediate: false,
})

watch(permissionId, (pid) => {
  if (pid)
    refresh()
}, { immediate: true })

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
      if (!s.id)
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
      onTimeSeconds: data.onTimeMinutes * 60,
      lateSeconds: data.lateMinutes * 60,
    }
    return $backend('/api/check-in-sessions', { method: 'POST', body })
  },
  {
    onSuccess: (result) => {
      navigateTo(`/dashboard/subjects/${subjectId}/check-ins/${result.id}`)
    },
  },
)
</script>

<template>
  <div class="flex flex-col gap-6">
    <UPageHeader title="Запустить check-in">
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
      <UFormField label="Проведение занятия" name="lessonScopeId" required>
        <USelectMenu
          v-model="selectedScopeOption"
          :items="scopeOptions"
          :loading="lessonsPending"
          :disabled="lessonsPending || scopeOptions.length === 0"
          placeholder="Выберите проведение занятия..."
          class="w-full"
        />
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

      <div class="grid gap-4 sm:grid-cols-2">
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
