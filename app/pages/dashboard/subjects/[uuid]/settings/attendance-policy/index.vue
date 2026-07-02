<script setup lang="ts">
import type { AttendancePolicyResponse } from '#hey-api'
import { getAttendancePolicy, updateAttendancePolicy } from '#hey-api'
import { vAttendancePolicyRequest } from '#hey-api/valibot.gen'

definePageMeta({ middleware: 'subject-permission' })

const route = useRoute()
const subjectId = String(route.params.uuid ?? '')

const { data, pending, error, refresh } = useApi(
  { key: `attendance-policy:${subjectId}` },
  () => getAttendancePolicy({ path: { subjectId } }),
)

const policy = computed<AttendancePolicyResponse | null>(() => data.value ?? null)

const { state, formRef, loading, onSubmit, onError } = useResourceForm<typeof vAttendancePolicyRequest>({
  initialState: () => ({ enabled: false, pointsPresent: 1, pointsLate: 0, pointsAbsent: 0, pointsExcused: 0 }),
  successMessage: 'Политика сохранена',
})

watch(policy, (p) => {
  if (!p)
    return
  state.enabled = p.enabled ?? false
  state.pointsPresent = p.pointsPresent ?? 1
  state.pointsLate = p.pointsLate ?? 0
  state.pointsAbsent = p.pointsAbsent ?? 0
  state.pointsExcused = p.pointsExcused ?? 0
}, { immediate: true })

const handleSave = onSubmit(
  data => updateAttendancePolicy({ path: { subjectId }, body: data }),
  { onSuccess: () => refresh() },
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
        :schema="vAttendancePolicyRequest"
        :state="state"
        class="flex flex-col gap-4"
        @submit="handleSave"
        @error="onError"
      >
        <UCard :ui="{ body: 'flex flex-col gap-4' }">
          <USwitch v-model="state.enabled" label="Учитывать посещаемость в баллах" />

          <UAlert
            color="neutral"
            variant="soft"
            icon="i-lucide-info"
            title="Зачем это нужно"
            description="Баллы за посещаемость прибавляются к сумме студента в таблицах оценок и итогов. Значение может быть отрицательным — например, минус за пропуск. Если в «Промежуточной аттестации» выбран режим «Включена в балл», именно эти баллы войдут в итог."
          />

          <template v-if="state.enabled">
            <USeparator />

            <p class="text-sm text-muted">
              Укажите, сколько баллов начисляется за каждый тип посещения за одно занятие.
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
