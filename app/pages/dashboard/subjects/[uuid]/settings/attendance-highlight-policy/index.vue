<script setup lang="ts">
import type { AttendanceHighlightPolicyRequest, AttendanceHighlightPolicyResponse } from '#hey-api'
import type { SchemaFor } from '~/utils/validation'
import * as v from 'valibot'
import { getAttendanceHighlightPolicy, updateAttendanceHighlightPolicy } from '#hey-api'
import { ATTENDANCE_HIGHLIGHT_DEFAULTS } from '~/utils/highlight'
import { hexColor } from '~/utils/validation'

definePageMeta({ middleware: 'subject-permission' })

type AttendanceHighlightPolicyForm = Required<AttendanceHighlightPolicyRequest>

const AttendanceHighlightPolicySchema: SchemaFor<AttendanceHighlightPolicyForm> = v.object({
  enabled: v.boolean(),
  presentColor: hexColor(),
  lateColor: hexColor(),
  absentColor: hexColor(),
  excusedColor: hexColor(),
})

const colorFields: { key: Exclude<keyof AttendanceHighlightPolicyForm, 'enabled'>, label: string }[] = [
  { key: 'presentColor', label: 'Присутствие' },
  { key: 'lateColor', label: 'Опоздание' },
  { key: 'absentColor', label: 'Отсутствие' },
  { key: 'excusedColor', label: 'Уважительная причина' },
]

const route = useRoute()
const subjectId = String(route.params.uuid ?? '')

const { data, pending, error, refresh } = useApi(
  { key: `attendance-highlight-policy:${subjectId}` },
  () => getAttendanceHighlightPolicy({ path: { subjectId } }),
)

const policy = computed<AttendanceHighlightPolicyResponse | null>(() => data.value ?? null)

const { state, formRef, loading, onSubmit, onError } = useResourceForm<typeof AttendanceHighlightPolicySchema>({
  initialState: () => ({ enabled: false, ...ATTENDANCE_HIGHLIGHT_DEFAULTS }),
  successMessage: 'Политика сохранена',
})

watch(policy, (p) => {
  if (!p)
    return
  state.enabled = p.enabled ?? false
  state.presentColor = p.presentColor ?? ATTENDANCE_HIGHLIGHT_DEFAULTS.presentColor
  state.lateColor = p.lateColor ?? ATTENDANCE_HIGHLIGHT_DEFAULTS.lateColor
  state.absentColor = p.absentColor ?? ATTENDANCE_HIGHLIGHT_DEFAULTS.absentColor
  state.excusedColor = p.excusedColor ?? ATTENDANCE_HIGHLIGHT_DEFAULTS.excusedColor
}, { immediate: true })

const handleSave = onSubmit(
  (data) => {
    const body: AttendanceHighlightPolicyRequest = data.enabled
      ? {
          enabled: true,
          presentColor: data.presentColor.toUpperCase(),
          lateColor: data.lateColor.toUpperCase(),
          absentColor: data.absentColor.toUpperCase(),
          excusedColor: data.excusedColor.toUpperCase(),
        }
      : { enabled: false }
    return updateAttendanceHighlightPolicy({ path: { subjectId }, body })
  },
  { onSuccess: () => refresh() },
)
</script>

<template>
  <div class="flex flex-col gap-6">
    <UPageHeader title="Подсветка таблицы посещаемости">
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
        :schema="AttendanceHighlightPolicySchema"
        :state="state"
        class="flex flex-col gap-4"
        @submit="handleSave"
        @error="onError"
      >
        <PoliciesHighlightPolicyFields
          :state="state"
          :color-fields="colorFields"
          switch-label="Использовать свои цвета подсветки посещаемости"
          description="Ячейки таблицы посещаемости всегда окрашиваются по статусу студента: присутствие, опоздание, отсутствие или уважительная причина. Если переключатель выключен, используются стандартные цвета; включите его, чтобы задать свои."
          :loading="loading"
          :settings-path="`/dashboard/subjects/${subjectId}/settings`"
        />
      </UForm>
    </template>
  </div>
</template>
