<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'
import type { SchemaFor } from '~/utils/validation'
import * as v from 'valibot'

definePageMeta({ middleware: 'subject-permission' })

type PenaltyPolicyRequest = components['schemas']['PenaltyPolicyRequest']
type PenaltyPolicyResponse = components['schemas']['PenaltyPolicyResponse']

type PenaltyPolicyForm = PenaltyPolicyRequest

const PenaltyPolicySchema: SchemaFor<PenaltyPolicyForm> = v.pipe(
  v.object({
    enabled: v.boolean(),
    operation: v.picklist(['SUBTRACT', 'MULTIPLY'] as const, 'Выберите операцию'),
    step: v.number('Введите шаг'),
    gracePeriodLessons: v.pipe(v.number('Введите значение'), v.integer('Должно быть целым числом'), v.minValue(0, 'Должно быть не меньше 0')),
    intervalLessons: v.pipe(v.number('Введите значение'), v.integer('Должно быть целым числом'), v.minValue(1, 'Должно быть не меньше 1')),
    maxReductions: v.pipe(v.number('Введите значение'), v.integer('Должно быть целым числом'), v.minValue(1, 'Должно быть не меньше 1')),
    bonusEnabled: v.boolean(),
    bonusOperation: v.picklist(['ADD', 'MULTIPLY'] as const, 'Выберите операцию'),
    bonusStep: v.number('Введите шаг'),
    bonusGracePeriodLessons: v.pipe(v.number('Введите значение'), v.integer('Должно быть целым числом'), v.minValue(0, 'Должно быть не меньше 0')),
    bonusIntervalLessons: v.pipe(v.number('Введите значение'), v.integer('Должно быть целым числом'), v.minValue(1, 'Должно быть не меньше 1')),
    bonusMaxIncreases: v.pipe(v.number('Введите значение'), v.integer('Должно быть целым числом'), v.minValue(1, 'Должно быть не меньше 1')),
  }),
  v.forward(
    v.check((input) => {
      if (input.operation === 'MULTIPLY')
        return input.step >= 0.1 && input.step <= 1
      return input.step >= 0
    }, 'При умножении шаг должен быть от 0.1 до 1, при вычитании — не меньше 0'),
    ['step'],
  ),
  v.forward(
    v.check((input) => {
      if (!input.bonusEnabled)
        return true
      if (input.bonusOperation === 'MULTIPLY')
        return input.bonusStep >= 1
      return input.bonusStep >= 0
    }, 'При умножении бонусный шаг должен быть не меньше 1, при прибавлении — не меньше 0'),
    ['bonusStep'],
  ),
)

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
    bonusEnabled: false,
    bonusOperation: 'ADD',
    bonusStep: 0,
    bonusGracePeriodLessons: 0,
    bonusIntervalLessons: 1,
    bonusMaxIncreases: 1,
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
    state.bonusEnabled = p.bonusEnabled ?? false
    state.bonusOperation = p.bonusOperation ?? 'ADD'
    state.bonusStep = p.bonusStep ?? 0
    state.bonusGracePeriodLessons = p.bonusGracePeriodLessons ?? 0
    state.bonusIntervalLessons = p.bonusIntervalLessons ?? 1
    state.bonusMaxIncreases = p.bonusMaxIncreases ?? 1
  },
  { immediate: true },
)

const operationOptions = [
  { value: 'SUBTRACT' as const, label: 'Вычитание' },
  { value: 'MULTIPLY' as const, label: 'Умножение' },
]

const bonusOperationOptions = [
  { value: 'ADD' as const, label: 'Прибавление' },
  { value: 'MULTIPLY' as const, label: 'Умножение' },
]

const handleSave = onSubmit(
  (data) => {
    const body: PenaltyPolicyRequest = {
      enabled: data.enabled,
      bonusEnabled: data.bonusEnabled,
      ...(data.enabled
        ? {
            operation: data.operation,
            step: data.step,
            gracePeriodLessons: data.gracePeriodLessons,
            intervalLessons: data.intervalLessons,
            maxReductions: data.maxReductions,
          }
        : {}),
      ...(data.bonusEnabled
        ? {
            bonusOperation: data.bonusOperation,
            bonusStep: data.bonusStep,
            bonusGracePeriodLessons: data.bonusGracePeriodLessons,
            bonusIntervalLessons: data.bonusIntervalLessons,
            bonusMaxIncreases: data.bonusMaxIncreases,
          }
        : {}),
    }

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
    <UPageHeader title="Политика понижения / повышения балла">
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
        <UAlert
          color="neutral"
          variant="soft"
          icon="i-lucide-info"
          title="Как это работает"
        >
          <template #description>
            <div class="flex flex-col gap-1.5">
              <p>
                Сроки сдачи считаются <b>в занятиях</b>, а не в днях: отсчёт идёт от
                дедлайна — <b>активного занятия</b> предмета. Чем позже сдано, тем
                больше понижений; чем раньше — тем больше бонусов.
              </p>
              <p>
                <b>Отсрочка</b> — бесплатный запас занятий до первого изменения,
                <b>интервал</b> — через сколько занятий применяется следующее,
                <b>максимум</b> — предел числа изменений.
              </p>
              <p class="text-muted">
                Пример: вычитание, шаг 5, отсрочка 1, интервал 2. Сдал на 1 занятие
                позже — без штрафа; на 3 — минус 5; на 5 и позже — минус 10.
                В таблицах оценок и итогов балл уже показан с учётом корректировки
                (исходный виден в подсказке к ячейке).
              </p>
            </div>
          </template>
        </UAlert>

        <!-- Штраф -->
        <UCard :ui="{ body: 'flex flex-col gap-4' }">
          <div class="flex items-center gap-2">
            <span class="i-lucide-trending-down w-4 h-4 text-warning" />
            <span class="font-semibold text-default">Понижение балла за просрочку</span>
          </div>

          <USwitch v-model="state.enabled" label="Включить понижение балла" />

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
                :step="0.05"
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

        <!-- Бонус -->
        <UCard :ui="{ body: 'flex flex-col gap-4' }">
          <div class="flex items-center gap-2">
            <span class="i-lucide-trending-up w-4 h-4 text-success" />
            <span class="font-semibold text-default">Повышение балла за досрочную сдачу</span>
          </div>

          <USwitch v-model="state.bonusEnabled" label="Включить бонус за досрочную сдачу" />

          <template v-if="state.bonusEnabled">
            <USeparator />

            <UFormField label="Операция" name="bonusOperation" required>
              <USelect
                v-model="state.bonusOperation"
                :items="bonusOperationOptions"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Шаг повышения" name="bonusStep" required>
              <UInput
                v-model.number="state.bonusStep"
                type="number"
                :min="state.bonusOperation === 'MULTIPLY' ? 1 : 0"
                :step="0.05"
                class="w-full"
              />
              <template #hint>
                <span class="text-muted text-sm">
                  {{ state.bonusOperation === 'ADD' ? 'Баллы, которые прибавляются за каждый бонус' : 'Множитель не меньше 1 (например, 1.1)' }}
                </span>
              </template>
            </UFormField>

            <UFormField label="Отсрочка (занятия)" name="bonusGracePeriodLessons" required>
              <UInput
                v-model.number="state.bonusGracePeriodLessons"
                type="number"
                :min="0"
                class="w-full"
              />
              <template #hint>
                <span class="text-muted text-sm">Через сколько занятий до дедлайна начинается бонус</span>
              </template>
            </UFormField>

            <UFormField label="Интервал (занятия)" name="bonusIntervalLessons" required>
              <UInput
                v-model.number="state.bonusIntervalLessons"
                type="number"
                :min="1"
                class="w-full"
              />
              <template #hint>
                <span class="text-muted text-sm">Через сколько занятий применяется каждый следующий бонус</span>
              </template>
            </UFormField>

            <UFormField label="Максимум повышений" name="bonusMaxIncreases" required>
              <UInput
                v-model.number="state.bonusMaxIncreases"
                type="number"
                :min="1"
                class="w-full"
              />
              <template #hint>
                <span class="text-muted text-sm">Максимальное количество раз, которое может быть применён бонус</span>
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
