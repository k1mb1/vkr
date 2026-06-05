<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'
import type { SchemaFor } from '~/utils/validation'
import * as v from 'valibot'

definePageMeta({ middleware: 'subject-permission' })

type AttendanceHighlightPolicyRequest = components['schemas']['AttendanceHighlightPolicyRequest']
type AttendanceHighlightPolicyResponse = components['schemas']['AttendanceHighlightPolicyResponse']

interface AttendanceHighlightPolicyForm {
  enabled: boolean
  presentColor: string
  lateColor: string
  absentColor: string
  excusedColor: string
}

const hexColorPattern = /^#[0-9A-F]{6}$/i

const AttendanceHighlightPolicySchema: SchemaFor<AttendanceHighlightPolicyForm> = v.object({
  enabled: v.boolean(),
  presentColor: v.pipe(
    v.string('Введите цвет'),
    v.regex(hexColorPattern, 'Формат HEX: #RRGGBB'),
  ),
  lateColor: v.pipe(
    v.string('Введите цвет'),
    v.regex(hexColorPattern, 'Формат HEX: #RRGGBB'),
  ),
  absentColor: v.pipe(
    v.string('Введите цвет'),
    v.regex(hexColorPattern, 'Формат HEX: #RRGGBB'),
  ),
  excusedColor: v.pipe(
    v.string('Введите цвет'),
    v.regex(hexColorPattern, 'Формат HEX: #RRGGBB'),
  ),
})

const colorFields: { key: Exclude<keyof AttendanceHighlightPolicyForm, 'enabled'>, label: string }[] = [
  { key: 'presentColor', label: 'Присутствие' },
  { key: 'lateColor', label: 'Опоздание' },
  { key: 'absentColor', label: 'Отсутствие' },
  { key: 'excusedColor', label: 'Уважительная причина' },
]

const route = useRoute()
const subjectId = String(route.params.uuid ?? '')

const { $backend } = useNuxtApp()

const { data, pending, error, refresh } = useBackend('/api/attendance-highlight-policy/subjects/{subjectId}', {
  method: 'GET',
  path: { subjectId },
})

const policy = computed<AttendanceHighlightPolicyResponse | null>(() => data.value ?? null)

const { state, formRef, loading, onSubmit, onError } = useResourceForm<typeof AttendanceHighlightPolicySchema>({
  initialState: () => ({
    enabled: false,
    presentColor: '#86EFAC',
    lateColor: '#FCD34D',
    absentColor: '#FCA5A5',
    excusedColor: '#93C5FD',
  }),
  successMessage: 'Политика сохранена',
})

watch(
  policy,
  (p) => {
    if (!p)
      return
    state.enabled = p.enabled ?? false
    state.presentColor = p.presentColor ?? '#86EFAC'
    state.lateColor = p.lateColor ?? '#FCD34D'
    state.absentColor = p.absentColor ?? '#FCA5A5'
    state.excusedColor = p.excusedColor ?? '#93C5FD'
  },
  { immediate: true },
)

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

    return $backend('/api/attendance-highlight-policy/subjects/{subjectId}', {
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
        <UCard :ui="{ body: 'flex flex-col gap-4' }">
          <UCheckbox
            v-model="state.enabled"
            label="Включить цветовую подсветку таблицы посещаемости"
          />

          <p class="text-sm text-muted">
            Раскраска ячеек таблицы посещаемости по цветам. Фронт применяет эти цвета
            к ячейкам в зависимости от статуса attendance.
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
