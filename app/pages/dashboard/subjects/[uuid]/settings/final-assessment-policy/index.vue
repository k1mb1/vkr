<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'
import type { SchemaFor } from '~/utils/validation'
import * as v from 'valibot'

definePageMeta({ middleware: 'subject-permission' })

type FinalAssessmentPolicyRequest = components['schemas']['FinalAssessmentPolicyRequest']
type FinalAssessmentPolicyResponse = components['schemas']['FinalAssessmentPolicyResponse']
type Band = components['schemas']['Band']

interface LevelForm {
  label: string
  minPoints?: number
  requiredTasks?: number
}

interface FinalAssessmentPolicyForm {
  enabled: boolean
  levels: LevelForm[]
}

const LevelSchema: SchemaFor<LevelForm> = v.object({
  label: v.pipe(v.string('Введите ярлык'), v.minLength(1, 'Ярлык обязателен')),
  minPoints: v.optional(v.pipe(v.number(), v.minValue(0))),
  requiredTasks: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
})

const FinalAssessmentPolicySchema: SchemaFor<FinalAssessmentPolicyForm> = v.pipe(
  v.object({
    enabled: v.boolean(),
    levels: v.array(LevelSchema),
  }),
  v.forward(
    v.check((input) => {
      if (!input.enabled)
        return true
      return input.levels.length > 0
    }, 'Добавьте хотя бы один уровень'),
    ['levels'],
  ),
)

const route = useRoute()
const subjectId = String(route.params.uuid ?? '')

const { $backend } = useNuxtApp()

const { data, pending, error, refresh } = useBackend('/api/final-assessment-policy/subjects/{subjectId}', {
  method: 'GET',
  path: { subjectId },
})

const policy = computed<FinalAssessmentPolicyResponse | null>(() => data.value ?? null)

const { state, formRef, loading, onSubmit, onError } = useResourceForm<typeof FinalAssessmentPolicySchema>({
  initialState: () => ({
    enabled: false,
    levels: [] as LevelForm[],
  }),
  successMessage: 'Политика сохранена',
})

function levelFromResponse(b: Band | undefined): LevelForm {
  return {
    label: b?.label ?? '',
    minPoints: b?.minPoints ?? undefined,
    requiredTasks: b?.requiredTasks ?? undefined,
  }
}

watch(
  policy,
  (p) => {
    if (!p)
      return
    state.enabled = p.enabled ?? false
    state.levels = (p.bands ?? []).map(levelFromResponse)
  },
  { immediate: true },
)

function addLevel() {
  state.levels.push({ label: '', minPoints: undefined, requiredTasks: undefined })
}

function removeLevel(index: number) {
  state.levels.splice(index, 1)
}

function moveLevel(index: number, direction: number) {
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= state.levels.length)
    return
  const temp = state.levels[index]!
  state.levels[index] = state.levels[newIndex]!
  state.levels[newIndex] = temp
}

const handleSave = onSubmit(
  (data) => {
    const body: FinalAssessmentPolicyRequest = {
      enabled: data.enabled,
      ...(data.enabled
        ? {
            bands: data.levels.map(l => ({
              label: l.label,
              ...(l.minPoints != null ? { minPoints: l.minPoints } : {}),
              ...(l.requiredTasks != null ? { requiredTasks: l.requiredTasks } : {}),
            })),
          }
        : {}),
    }

    return $backend('/api/final-assessment-policy/subjects/{subjectId}', {
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
    <UPageHeader title="Итоговая оценка">
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
        :schema="FinalAssessmentPolicySchema"
        :state="state"
        class="flex flex-col gap-4"
        @submit="handleSave"
        @error="onError"
      >
        <UCard :ui="{ body: 'flex flex-col gap-4' }">
          <UCheckbox
            v-model="state.enabled"
            label="Включить итоговую оценку"
          />

          <template v-if="state.enabled">
            <USeparator />

            <div class="flex items-center justify-between">
              <span class="font-semibold text-default">Уровни</span>
              <UButton
                icon="i-lucide-plus"
                label="Добавить уровень"
                color="neutral"
                variant="outline"
                @click="addLevel"
              />
            </div>

            <p class="text-sm text-muted">
              Первый уровень — самый высокий (например, «5» или «зачтено»).
              Используйте стрелки для изменения порядка.
              Для каждого уровня можно задать минимальные баллы, количество обязательных задач, или оба условия.
            </p>

            <div v-if="state.levels.length === 0" class="text-sm text-muted italic">
              Нет добавленных уровней.
            </div>

            <div
              v-for="(level, index) in state.levels"
              :key="index"
              class="flex flex-col gap-3 rounded-lg border p-4"
            >
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium text-muted">Уровень {{ index + 1 }}</span>
                <div class="flex items-center gap-1">
                  <UButton
                    icon="i-lucide-arrow-up"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    :disabled="index === 0"
                    @click="moveLevel(index, -1)"
                  />
                  <UButton
                    icon="i-lucide-arrow-down"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    :disabled="index === state.levels.length - 1"
                    @click="moveLevel(index, 1)"
                  />
                  <UButton
                    icon="i-lucide-trash-2"
                    color="error"
                    variant="ghost"
                    size="xs"
                    @click="removeLevel(index)"
                  />
                </div>
              </div>

              <UFormField :name="`levels.${index}.label`" label="Ярлык" required>
                <UInput
                  v-model="level.label"
                  placeholder="5, зачтено, незачтено..."
                  class="w-full"
                />
              </UFormField>

              <div class="grid gap-3 sm:grid-cols-2">
                <UFormField :name="`levels.${index}.minPoints`" label="Мин. баллов (опционально)">
                  <UInput
                    v-model.number="level.minPoints"
                    type="number"
                    :min="0"
                    placeholder="Без ограничения"
                    class="w-full"
                  />
                </UFormField>

                <UFormField :name="`levels.${index}.requiredTasks`" label="Мин. количество обязательных задач (опционально)">
                  <UInput
                    v-model.number="level.requiredTasks"
                    type="number"
                    :min="0"
                    placeholder="Без ограничения"
                    class="w-full"
                  />
                </UFormField>
              </div>
            </div>
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
