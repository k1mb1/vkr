<script setup lang="ts">
import type { GradingHighlightPolicyRequest, GradingHighlightPolicyResponse } from '#hey-api'
import type { SchemaFor } from '~/utils/validation'
import * as v from 'valibot'
import { getGradingHighlightPolicy, updateGradingHighlightPolicy } from '#hey-api'
import { GRADING_HIGHLIGHT_DEFAULTS } from '~/utils/highlight'
import { hexColor } from '~/utils/validation'

definePageMeta({ middleware: 'subject-permission' })

type GradingHighlightPolicyForm = Required<GradingHighlightPolicyRequest>

const GradingHighlightPolicySchema: SchemaFor<GradingHighlightPolicyForm> = v.object({
  enabled: v.boolean(),
  assignmentColor: hexColor(),
  fullColor: hexColor(),
  partialLowColor: hexColor(),
  partialHighColor: hexColor(),
})

const colorFields: { key: Exclude<keyof GradingHighlightPolicyForm, 'enabled'>, label: string, help?: string }[] = [
  { key: 'assignmentColor', label: 'Колонка задания', help: 'Фон шапки колонок с заданиями' },
  { key: 'fullColor', label: 'Решено полностью', help: 'Балл равен максимуму задания' },
  { key: 'partialLowColor', label: 'Решено меньше половины', help: '50% от максимума и меньше' },
  { key: 'partialHighColor', label: 'Решено больше половины', help: 'Больше 50% от максимума' },
]

const route = useRoute()
const subjectId = String(route.params.uuid ?? '')

const { data, pending, error, refresh } = useApi(
  { key: `grading-highlight-policy:${subjectId}` },
  () => getGradingHighlightPolicy({ path: { subjectId } }),
)

const policy = computed<GradingHighlightPolicyResponse | null>(() => data.value ?? null)

const { state, formRef, loading, onSubmit, onError } = useResourceForm<typeof GradingHighlightPolicySchema>({
  initialState: () => ({ enabled: false, ...GRADING_HIGHLIGHT_DEFAULTS }),
  successMessage: 'Политика сохранена',
})

watch(policy, (p) => {
  if (!p)
    return
  state.enabled = p.enabled ?? false
  state.assignmentColor = p.assignmentColor ?? GRADING_HIGHLIGHT_DEFAULTS.assignmentColor
  state.fullColor = p.fullColor ?? GRADING_HIGHLIGHT_DEFAULTS.fullColor
  state.partialLowColor = p.partialLowColor ?? GRADING_HIGHLIGHT_DEFAULTS.partialLowColor
  state.partialHighColor = p.partialHighColor ?? GRADING_HIGHLIGHT_DEFAULTS.partialHighColor
}, { immediate: true })

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
    return updateGradingHighlightPolicy({ path: { subjectId }, body })
  },
  { onSuccess: () => refresh() },
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
        <PoliciesHighlightPolicyFields
          :state="state"
          :color-fields="colorFields"
          switch-label="Использовать свои цвета подсветки оценок"
          description="Ячейки таблицы оценок всегда окрашиваются по тому, насколько решено задание: полностью (балл равен максимуму), больше половины или половина и меньше; отдельный цвет — фон шапки колонок заданий. Если переключатель выключен, используются стандартные цвета; включите его, чтобы задать свои."
          :loading="loading"
          :settings-path="`/dashboard/subjects/${subjectId}/settings`"
        />
      </UForm>
    </template>
  </div>
</template>
