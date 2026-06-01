<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'
import type { SchemaFor } from '~/utils/validation'
import * as v from 'valibot'

definePageMeta({ middleware: 'subject-permission' })

type AttendancePolicyRequest = components['schemas']['AttendancePolicyRequest']
type AttendancePolicyResponse = components['schemas']['AttendancePolicyResponse']

interface AttendancePolicyForm {
  enabled: boolean
  pointsPresent: number
  pointsLate: number
  pointsAbsent: number
  pointsExcused: number
}

const AttendancePolicySchema: SchemaFor<AttendancePolicyForm> = v.object({
  enabled: v.boolean(),
  pointsPresent: v.number('Введите значение'),
  pointsLate: v.number('Введите значение'),
  pointsAbsent: v.number('Введите значение'),
  pointsExcused: v.number('Введите значение'),
})

const route = useRoute()
const subjectId = String(route.params.uuid ?? '')

const { $backend } = useNuxtApp()

const { data, pending, error, refresh } = useBackend('/api/attendance-policy/subjects/{subjectId}', {
  method: 'GET',
  path: { subjectId },
})

const policy = computed<AttendancePolicyResponse | null>(() => data.value ?? null)

const { state, formRef, loading, onSubmit, onError } = useResourceForm<typeof AttendancePolicySchema>({
  initialState: () => ({
    enabled: false,
    pointsPresent: 1,
    pointsLate: 0,
    pointsAbsent: 0,
    pointsExcused: 0,
  }),
  successMessage: 'Политика сохранена',
})

watch(
  policy,
  (p) => {
    if (!p)
      return
    state.enabled = p.enabled ?? false
    state.pointsPresent = p.pointsPresent ?? 1
    state.pointsLate = p.pointsLate ?? 0
    state.pointsAbsent = p.pointsAbsent ?? 0
    state.pointsExcused = p.pointsExcused ?? 0
  },
  { immediate: true },
)

const handleSave = onSubmit(
  (data) => {
    const body: AttendancePolicyRequest = {
      enabled: data.enabled,
      pointsPresent: data.pointsPresent,
      pointsLate: data.pointsLate,
      pointsAbsent: data.pointsAbsent,
      pointsExcused: data.pointsExcused,
    }

    return $backend('/api/attendance-policy/subjects/{subjectId}', {
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
    <UPageHeader title="Политика учёта посещаемости">
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
        :schema="AttendancePolicySchema"
        :state="state"
        class="flex flex-col gap-4"
        @submit="handleSave"
        @error="onError"
      >
        <UCard :ui="{ body: 'flex flex-col gap-4' }">
          <UCheckbox v-model="state.enabled" label="Учитывать посещаемость в баллах" />

          <template v-if="state.enabled">
            <USeparator />

            <p class="text-sm text-muted">
              Укажите, сколько баллов начисляется за каждый тип посещения. Значение может быть отрицательным.
            </p>

            <UFormField label="Присутствие" name="pointsPresent" required>
              <UInput
                v-model.number="state.pointsPresent"
                type="number"
                step="0.5"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Опоздание" name="pointsLate" required>
              <UInput
                v-model.number="state.pointsLate"
                type="number"
                step="0.5"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Отсутствие" name="pointsAbsent" required>
              <UInput
                v-model.number="state.pointsAbsent"
                type="number"
                step="0.5"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Уважительная причина" name="pointsExcused" required>
              <UInput
                v-model.number="state.pointsExcused"
                type="number"
                step="0.5"
                class="w-full"
              />
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
