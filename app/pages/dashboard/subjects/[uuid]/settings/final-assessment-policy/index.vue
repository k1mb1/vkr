<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'
import type { SchemaFor } from '~/utils/validation'
import * as v from 'valibot'

definePageMeta({ middleware: 'subject-permission' })

type FinalAssessmentPolicyRequest = components['schemas']['FinalAssessmentPolicyRequest']
type FinalAssessmentPolicyResponse = components['schemas']['FinalAssessmentPolicyResponse']
type Band = components['schemas']['Band']

interface BandForm {
  label: string
  minPoints?: number
  requiredTasks?: number
}

interface FinalAssessmentPolicyForm {
  enabled: boolean
  bands: BandForm[]
  attendanceMode: 'COMBINED' | 'SEPARATE'
  attendanceRequirementMode: 'PERCENT' | 'COUNT'
  attendanceMinPercent?: number
  attendanceMinCount?: number
  attendanceCountPresent: boolean
  attendanceCountLate: boolean
  attendanceCountAbsent: boolean
  attendanceCountExcused: boolean
}

const BandSchema: SchemaFor<BandForm> = v.object({
  label: v.pipe(v.string('Введите ярлык'), v.minLength(1, 'Ярлык обязателен')),
  minPoints: v.optional(v.pipe(v.number(), v.minValue(0))),
  requiredTasks: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
})

const FinalAssessmentPolicySchema: SchemaFor<FinalAssessmentPolicyForm> = v.pipe(
  v.object({
    enabled: v.boolean(),
    bands: v.array(BandSchema),
    attendanceMode: v.picklist(['COMBINED', 'SEPARATE'] as const),
    attendanceRequirementMode: v.picklist(['PERCENT', 'COUNT'] as const),
    attendanceMinPercent: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(100))),
    attendanceMinCount: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
    attendanceCountPresent: v.boolean(),
    attendanceCountLate: v.boolean(),
    attendanceCountAbsent: v.boolean(),
    attendanceCountExcused: v.boolean(),
  }),
  v.forward(
    v.check((input) => {
      if (!input.enabled)
        return true
      return input.bands.length > 0
    }, 'Должна быть добавлена хотя бы одна банда'),
    ['bands'],
  ),
  v.forward(
    v.check((input) => {
      if (!input.enabled || input.attendanceMode !== 'SEPARATE' || input.attendanceRequirementMode !== 'PERCENT')
        return true
      return input.attendanceMinPercent != null
    }, 'Укажите минимальный процент посещения'),
    ['attendanceMinPercent'],
  ),
  v.forward(
    v.check((input) => {
      if (!input.enabled || input.attendanceMode !== 'SEPARATE' || input.attendanceRequirementMode !== 'COUNT')
        return true
      return input.attendanceMinCount != null
    }, 'Укажите минимальное количество посещений'),
    ['attendanceMinCount'],
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
    bands: [] as BandForm[],
    attendanceMode: 'COMBINED' as const,
    attendanceRequirementMode: 'PERCENT' as const,
    attendanceMinPercent: undefined,
    attendanceMinCount: undefined,
    attendanceCountPresent: true,
    attendanceCountLate: true,
    attendanceCountAbsent: false,
    attendanceCountExcused: true,
  }),
  successMessage: 'Политика сохранена',
})

function bandFromResponse(b: Band | undefined): BandForm {
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
    state.bands = (p.bands ?? []).map(bandFromResponse)
    state.attendanceMode = p.attendanceMode ?? 'COMBINED'
    state.attendanceRequirementMode = p.attendanceRequirementMode ?? 'PERCENT'
    state.attendanceMinPercent = p.attendanceMinPercent ?? undefined
    state.attendanceMinCount = p.attendanceMinCount ?? undefined
    state.attendanceCountPresent = p.attendanceCountPresent ?? true
    state.attendanceCountLate = p.attendanceCountLate ?? true
    state.attendanceCountAbsent = p.attendanceCountAbsent ?? false
    state.attendanceCountExcused = p.attendanceCountExcused ?? true
  },
  { immediate: true },
)

const attendanceModeOptions = [
  { value: 'COMBINED' as const, label: 'Включать в балл (COMBINED)' },
  { value: 'SEPARATE' as const, label: 'Отдельный гейт (SEPARATE)' },
]

const attendanceRequirementModeOptions = [
  { value: 'PERCENT' as const, label: 'Процент' },
  { value: 'COUNT' as const, label: 'Количество' },
]

function addBand() {
  state.bands.push({ label: '', minPoints: undefined, requiredTasks: undefined })
}

function removeBand(index: number) {
  state.bands.splice(index, 1)
}

function moveBand(index: number, direction: number) {
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= state.bands.length)
    return
  const temp = state.bands[index]!
  state.bands[index] = state.bands[newIndex]!
  state.bands[newIndex] = temp
}

const handleSave = onSubmit(
  (data) => {
    const body: FinalAssessmentPolicyRequest = {
      enabled: data.enabled,
      ...(data.enabled
        ? {
            bands: data.bands.map(b => ({
              label: b.label,
              ...(b.minPoints != null ? { minPoints: b.minPoints } : {}),
              ...(b.requiredTasks != null ? { requiredTasks: b.requiredTasks } : {}),
            })),
            attendanceMode: data.attendanceMode,
            ...(data.attendanceMode === 'SEPARATE'
              ? {
                  attendanceRequirementMode: data.attendanceRequirementMode,
                  ...(data.attendanceRequirementMode === 'PERCENT'
                    ? { attendanceMinPercent: data.attendanceMinPercent }
                    : { attendanceMinCount: data.attendanceMinCount }),
                  attendanceCountPresent: data.attendanceCountPresent,
                  attendanceCountLate: data.attendanceCountLate,
                  attendanceCountAbsent: data.attendanceCountAbsent,
                  attendanceCountExcused: data.attendanceCountExcused,
                }
              : {}),
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
    <UPageHeader title="Промежуточная аттестация (итоги)">
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
            label="Включить промежуточную аттестацию (итоги)"
          />

          <p class="text-sm text-muted">
            Настройка банд (ярлыков и условий) для промежуточной аттестации.
            Банды отправляются по убыванию старшинства (первая — самая старшая).
            Все вычисления вердикта выполняются на фронте.
          </p>

          <template v-if="state.enabled">
            <USeparator />

            <!-- Bands -->
            <div class="flex items-center justify-between">
              <span class="font-semibold text-default">Банды</span>
              <UButton
                icon="i-lucide-plus"
                label="Добавить банду"
                color="neutral"
                variant="outline"
                @click="addBand"
              />
            </div>

            <p class="text-sm text-muted">
              Первая банда в списке — самая старшая. Используйте стрелки для изменения порядка.
            </p>

            <div v-if="state.bands.length === 0" class="text-sm text-muted italic">
              Нет добавленных банд. Добавьте хотя бы одну.
            </div>

            <div
              v-for="(band, index) in state.bands"
              :key="index"
              class="flex flex-col gap-3 rounded-lg border p-4"
            >
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium text-muted">Банда #{{ index + 1 }}</span>
                <div class="flex items-center gap-1">
                  <UButton
                    icon="i-lucide-arrow-up"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    :disabled="index === 0"
                    @click="moveBand(index, -1)"
                  />
                  <UButton
                    icon="i-lucide-arrow-down"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    :disabled="index === state.bands.length - 1"
                    @click="moveBand(index, 1)"
                  />
                  <UButton
                    icon="i-lucide-trash-2"
                    color="error"
                    variant="ghost"
                    size="xs"
                    @click="removeBand(index)"
                  />
                </div>
              </div>

              <UFormField :name="`bands.${index}.label`" label="Ярлык" required>
                <UInput
                  v-model="band.label"
                  placeholder="5, зачтено, незачтено..."
                  class="w-full"
                />
              </UFormField>

              <div class="grid gap-3 sm:grid-cols-2">
                <UFormField :name="`bands.${index}.minPoints`" label="Мин. баллов">
                  <UInput
                    v-model.number="band.minPoints"
                    type="number"
                    :min="0"
                    placeholder="Без ограничения"
                    class="w-full"
                  />
                </UFormField>

                <UFormField :name="`bands.${index}.requiredTasks`" label="Мин. обязательных задач">
                  <UInput
                    v-model.number="band.requiredTasks"
                    type="number"
                    :min="0"
                    placeholder="Без ограничения"
                    class="w-full"
                  />
                </UFormField>
              </div>
            </div>

            <USeparator />

            <!-- Attendance mode -->
            <UFormField label="Учёт посещаемости" name="attendanceMode" required>
              <USelect
                v-model="state.attendanceMode"
                :items="attendanceModeOptions"
                class="w-full"
              />
            </UFormField>

            <template v-if="state.attendanceMode === 'SEPARATE'">
              <USeparator />

              <UFormField label="Режим требования" name="attendanceRequirementMode" required>
                <USelect
                  v-model="state.attendanceRequirementMode"
                  :items="attendanceRequirementModeOptions"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                v-if="state.attendanceRequirementMode === 'PERCENT'"
                label="Мин. процент посещений"
                name="attendanceMinPercent"
                required
              >
                <UInput
                  v-model.number="state.attendanceMinPercent"
                  type="number"
                  :min="0"
                  :max="100"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                v-if="state.attendanceRequirementMode === 'COUNT'"
                label="Мин. количество посещений"
                name="attendanceMinCount"
                required
              >
                <UInput
                  v-model.number="state.attendanceMinCount"
                  type="number"
                  :min="0"
                  class="w-full"
                />
              </UFormField>

              <p class="text-sm font-medium text-default">
                Какие статусы засчитывать как посещение:
              </p>

              <div class="grid gap-2 sm:grid-cols-2">
                <UCheckbox v-model="state.attendanceCountPresent" label="Присутствие (PRESENT)" />
                <UCheckbox v-model="state.attendanceCountLate" label="Опоздание (LATE)" />
                <UCheckbox v-model="state.attendanceCountAbsent" label="Отсутствие (ABSENT)" />
                <UCheckbox v-model="state.attendanceCountExcused" label="Уважительная (EXCUSED)" />
              </div>
            </template>
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
