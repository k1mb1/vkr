<script setup lang="ts">
import type { CheckInPolicyRequest, CheckInPolicyResponse } from '#hey-api'
import type { SchemaFor } from '~/utils/validation'
import * as v from 'valibot'
import { getCheckInPolicy, updateCheckInPolicy } from '#hey-api'

definePageMeta({ middleware: 'subject-permission' })

// UI в минутах, API в секундах — конвертируем на submit.
type CheckInPolicyForm = Omit<CheckInPolicyRequest, 'onTimeSeconds' | 'lateSeconds'> & {
  onTimeMinutes: number
  lateMinutes: number
}

const CheckInPolicySchema: SchemaFor<CheckInPolicyForm> = v.object({
  enabled: v.boolean(),
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

const { data, pending, error, refresh } = useApi(
  { key: `check-in-policy:${subjectId}` },
  () => getCheckInPolicy({ path: { subjectId } }),
)

const policy = computed<CheckInPolicyResponse | null>(() => data.value ?? null)

const { state, formRef, loading, onSubmit, onError } = useResourceForm<typeof CheckInPolicySchema>({
  initialState: () => ({ enabled: false, onTimeMinutes: 5, lateMinutes: 5 }),
  successMessage: 'Политика сохранена',
})

watch(policy, (p) => {
  if (!p)
    return
  state.enabled = p.enabled ?? false
  if (p.onTimeSeconds != null)
    state.onTimeMinutes = Math.max(1, Math.round(p.onTimeSeconds / 60))
  if (p.lateSeconds != null)
    state.lateMinutes = Math.max(0, Math.round(p.lateSeconds / 60))
}, { immediate: true })

const handleSave = onSubmit(
  (data) => {
    const body: CheckInPolicyRequest = data.enabled
      ? { enabled: true, onTimeSeconds: data.onTimeMinutes * 60, lateSeconds: data.lateMinutes * 60 }
      : { enabled: false }
    return updateCheckInPolicy({ path: { subjectId }, body })
  },
  { onSuccess: () => refresh() },
)
</script>

<template>
  <div class="flex flex-col gap-6">
    <UPageHeader title="Единое время на отметку">
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
        :schema="CheckInPolicySchema"
        :state="state"
        class="flex flex-col gap-4"
        @submit="handleSave"
        @error="onError"
      >
        <UCard :ui="{ body: 'flex flex-col gap-4' }">
          <USwitch
            v-model="state.enabled"
            label="Единые окна отметки для всего предмета"
          />

          <UAlert
            color="neutral"
            variant="soft"
            icon="i-lucide-info"
            title="Что такое окна отметки"
          >
            <template #description>
              <div class="flex flex-col gap-1.5">
                <p>
                  Когда преподаватель запускает отметку на занятии, студенты отмечаются
                  по QR-коду. <b>Основное окно</b> — время, пока отметка считается
                  «Присутствовал». После него идёт <b>окно для опоздавших</b> — отметка
                  даёт статус «Опоздал». Дальше отметиться нельзя.
                </p>
                <p class="text-muted">
                  Включите, чтобы зафиксировать единые окна для всех занятий предмета —
                  тогда поля времени на экране запуска отметки будут игнорироваться.
                  Выключите — задавайте окна каждый раз вручную при запуске.
                </p>
              </div>
            </template>
          </UAlert>

          <template v-if="state.enabled">
            <USeparator />

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
