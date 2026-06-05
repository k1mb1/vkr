<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'
import type { SchemaFor } from '~/utils/validation'
import * as v from 'valibot'

definePageMeta({ middleware: 'subject-permission' })

type GradingHighlightPolicyRequest = components['schemas']['GradingHighlightPolicyRequest']
type GradingHighlightPolicyResponse = components['schemas']['GradingHighlightPolicyResponse']

interface GradingHighlightPolicyForm {
  enabled: boolean
  assignmentColor: string
  fullColor: string
  partialLowColor: string
  partialHighColor: string
}

const hexColorPattern = /^#[0-9A-F]{6}$/i

const GradingHighlightPolicySchema: SchemaFor<GradingHighlightPolicyForm> = v.object({
  enabled: v.boolean(),
  assignmentColor: v.pipe(
    v.string('Введите цвет'),
    v.regex(hexColorPattern, 'Формат HEX: #RRGGBB'),
  ),
  fullColor: v.pipe(
    v.string('Введите цвет'),
    v.regex(hexColorPattern, 'Формат HEX: #RRGGBB'),
  ),
  partialLowColor: v.pipe(
    v.string('Введите цвет'),
    v.regex(hexColorPattern, 'Формат HEX: #RRGGBB'),
  ),
  partialHighColor: v.pipe(
    v.string('Введите цвет'),
    v.regex(hexColorPattern, 'Формат HEX: #RRGGBB'),
  ),
})

const colorFields: { key: Exclude<keyof GradingHighlightPolicyForm, 'enabled'>, label: string, help?: string }[] = [
  { key: 'assignmentColor', label: 'Колонка задания', help: 'Фон шапки колонок с заданиями' },
  { key: 'fullColor', label: 'Решено полностью', help: 'Балл равен максимуму задания' },
  { key: 'partialLowColor', label: 'Решено меньше половины', help: '50% от максимума и меньше' },
  { key: 'partialHighColor', label: 'Решено больше половины', help: 'Больше 50% от максимума' },
]

const route = useRoute()
const subjectId = String(route.params.uuid ?? '')

const { $backend } = useNuxtApp()

const { data, pending, error, refresh } = useBackend('/api/grading-highlight-policy/subjects/{subjectId}', {
  method: 'GET',
  path: { subjectId },
})

const policy = computed<GradingHighlightPolicyResponse | null>(() => data.value ?? null)

const { state, formRef, loading, onSubmit, onError } = useResourceForm<typeof GradingHighlightPolicySchema>({
  initialState: () => ({
    enabled: false,
    assignmentColor: '#BFDBFE',
    fullColor: '#86EFAC',
    partialLowColor: '#FCD34D',
    partialHighColor: '#BEF264',
  }),
  successMessage: 'Политика сохранена',
})

watch(
  policy,
  (p) => {
    if (!p)
      return
    state.enabled = p.enabled ?? false
    state.assignmentColor = p.assignmentColor ?? '#BFDBFE'
    state.fullColor = p.fullColor ?? '#86EFAC'
    state.partialLowColor = p.partialLowColor ?? '#FCD34D'
    state.partialHighColor = p.partialHighColor ?? '#BEF264'
  },
  { immediate: true },
)

const handleSave = onSubmit(
  (data) => {
    const body: GradingHighlightPolicyRequest = data.enabled
      ? {
          enabled: true,
          assignmentColor: data.assignmentColor.toUpperCase(),
          fullColor: data.fullColor.toUpperCase(),
          partialLowColor: data.partialLowColor.toUpperCase(),
          partialHighColor: data.partialHighColor.toUpperCase(),
        }
      : { enabled: false }

    return $backend('/api/grading-highlight-policy/subjects/{subjectId}', {
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
    <UPageHeader title="Подсветка таблицы оценок">
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
        :schema="GradingHighlightPolicySchema"
        :state="state"
        class="flex flex-col gap-4"
        @submit="handleSave"
        @error="onError"
      >
        <UCard :ui="{ body: 'flex flex-col gap-4' }">
          <UCheckbox
            v-model="state.enabled"
            label="Включить цветовую подсветку таблицы оценок"
          />

          <p class="text-sm text-muted">
            Раскраска ячеек таблицы оценок по цветам. Фронт применяет эти цвета
            к колонкам заданий и ячейкам в зависимости от прогресса студента.
          </p>

          <template v-if="state.enabled">
            <USeparator />

            <div class="grid gap-4 sm:grid-cols-2">
              <UFormField
                v-for="field in colorFields"
                :key="field.key"
                :label="field.label"
                :name="field.key"
                required
              >
                <ColorPickerPopover v-model="state[field.key]" />
                <template v-if="field.help" #help>
                  {{ field.help }}
                </template>
              </UFormField>
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
