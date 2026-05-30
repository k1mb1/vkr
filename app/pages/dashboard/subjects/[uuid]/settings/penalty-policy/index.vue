<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'
import type { SchemaFor } from '~/utils/validation'
import * as v from 'valibot'

definePageMeta({ middleware: 'subject-permission' })

type PenaltyPolicyRequest = components['schemas']['PenaltyPolicyRequest']
type PenaltyPolicyResponse = components['schemas']['PenaltyPolicyResponse']

const PenaltyPolicySchema: SchemaFor<PenaltyPolicyForm> = v.pipe(
  v.object({
    enabled: v.boolean(),
    operation: v.picklist(['SUBTRACT', 'MULTIPLY'] as const, 'Выберите операцию'),
    step: v.number('Введите шаг'),
    gracePeriodLessons: v.pipe(v.number('Введите значение'), v.integer('Должно быть целым числом'), v.minValue(0, 'Должно быть не меньше 0')),
    intervalLessons: v.pipe(v.number('Введите значение'), v.integer('Должно быть целым числом'), v.minValue(1, 'Должно быть не меньше 1')),
    maxReductions: v.pipe(v.number('Введите значение'), v.integer('Должно быть целым числом'), v.minValue(1, 'Должно быть не меньше 1')),
  }),
  v.forward(
    v.check((input) => {
      if (input.operation === 'MULTIPLY')
        return input.step >= 0.1 && input.step <= 1
      return input.step >= 0
    }, 'При умножении шаг должен быть от 0.1 до 1, при вычитании — не меньше 0'),
    ['step'],
  ),
)

interface PenaltyPolicyForm {
  enabled: boolean
  operation: 'SUBTRACT' | 'MULTIPLY'
  step: number
  gracePeriodLessons: number
  intervalLessons: number
  maxReductions: number
}

const route = useRoute()
const subjectId = String(route.params.uuid ?? '')

const { $backend } = useNuxtApp()

const { data, pending, error, refresh } = useBackend('/api/penalty-policy/subjects/{subjectId}', {
  method: 'GET',
  path: { subjectId },
})

const policy = computed<PenaltyPolicyResponse | null>(() => data.value ?? null)

const { state, formRef, loading, onSubmit, onError } = useResourceForm<typeof PenaltyPolicySchema>({
  initialState: () => ({
    enabled: false,
    operation: 'SUBTRACT',
    step: 0,
    gracePeriodLessons: 0,
    intervalLessons: 1,
    maxReductions: 1,
  }),
  successMessage: 'Политика сохранена',
})

watch(
  policy,
  (p) => {
    if (!p)
      return
    state.enabled = p.enabled ?? false
    state.operation = p.operation ?? 'SUBTRACT'
    state.step = p.step ?? 0
    state.gracePeriodLessons = p.gracePeriodLessons ?? 0
    state.intervalLessons = p.intervalLessons ?? 1
    state.maxReductions = p.maxReductions ?? 1
  },
  { immediate: true },
)

const operationOptions = [
  { value: 'SUBTRACT' as const, label: 'Вычитание' },
  { value: 'MULTIPLY' as const, label: 'Умножение' },
]

const handleSave = onSubmit(
  (data) => {
    const body: PenaltyPolicyRequest = data.enabled
      ? {
          enabled: true,
          operation: data.operation,
          step: data.step,
          gracePeriodLessons: data.gracePeriodLessons,
          intervalLessons: data.intervalLessons,
          maxReductions: data.maxReductions,
        }
      : { enabled: false }

    return $backend('/api/penalty-policy/subjects/{subjectId}', {
      method: 'PUT',
      path: { subjectId },
      body,
    })
  },
  {
    onSuccess: () => refresh(),
  },
)
</script>

<template>
  <div class="flex flex-col gap-6">
    <UPageHeader title="Политика понижения балла за просрочку">
      <template #links>
        <UButton
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="ghost"
          :loading="pending"
          @click="refresh()"
        />
        <UButton
          :to="`/dashboard/subjects/${subjectId}/settings`"
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="ghost"
          label="Назад"
        />
      </template>
    </UPageHeader>

    <template v-if="pending && !policy">
      <USkeleton class="h-8 w-1/3" />
      <USkeleton class="h-12 w-full" />
      <USkeleton class="h-12 w-full" />
      <USkeleton class="h-12 w-full" />
    </template>

    <UAlert
      v-else-if="error"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Ошибка загрузки"
      :description="error.message"
    />

    <template v-else-if="policy">
      <UForm
        ref="formRef"
        :schema="PenaltyPolicySchema"
        :state="state"
        class="flex flex-col gap-4"
        @submit="handleSave"
        @error="onError"
      >
        <UCard :ui="{ body: 'flex flex-col gap-4' }">
          <UCheckbox v-model="state.enabled" label="Включить понижение балла за просрочку" />

          <template v-if="state.enabled">
            <USeparator />

            <UFormField label="Операция" name="operation" required>
              <USelect
                v-model="state.operation"
                :items="operationOptions"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Шаг понижения" name="step" required>
              <UInput
                v-model.number="state.step"
                type="number"
                :min="state.operation === 'MULTIPLY' ? 0.1 : 0"
                :max="state.operation === 'MULTIPLY' ? 1 : undefined"
                :step="state.operation === 'MULTIPLY' ? 0.1 : 1"
                class="w-full"
              />
              <template #hint>
                <span class="text-muted text-sm">
                  {{ state.operation === 'SUBTRACT' ? 'Баллы, которые вычитаются за каждое понижение' : 'Множитель от 0.1 до 1 (например, 0.5)' }}
                </span>
              </template>
            </UFormField>

            <UFormField label="Отсрочка (занятия)" name="gracePeriodLessons" required>
              <UInput
                v-model.number="state.gracePeriodLessons"
                type="number"
                :min="0"
                class="w-full"
              />
              <template #hint>
                <span class="text-muted text-sm">Через сколько занятий после дедлайна начинается первое понижение</span>
              </template>
            </UFormField>

            <UFormField label="Интервал (занятия)" name="intervalLessons" required>
              <UInput
                v-model.number="state.intervalLessons"
                type="number"
                :min="1"
                class="w-full"
              />
              <template #hint>
                <span class="text-muted text-sm">Через сколько занятий применяется каждое следующее понижение</span>
              </template>
            </UFormField>

            <UFormField label="Максимум понижений" name="maxReductions" required>
              <UInput
                v-model.number="state.maxReductions"
                type="number"
                :min="1"
                class="w-full"
              />
              <template #hint>
                <span class="text-muted text-sm">Максимальное количество раз, которое может быть применено понижение</span>
              </template>
            </UFormField>
          </template>
        </UCard>

        <div class="flex justify-end gap-2">
          <UButton
            :to="`/dashboard/subjects/${subjectId}/settings`"
            color="neutral"
            variant="ghost"
            type="button"
          >
            Отмена
          </UButton>
          <UButton
            type="submit"
            icon="i-lucide-check"
            :loading="loading"
          >
            Сохранить
          </UButton>
        </div>
      </UForm>
    </template>
  </div>
</template>
