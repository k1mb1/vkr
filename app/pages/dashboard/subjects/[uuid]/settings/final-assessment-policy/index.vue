<script setup lang="ts">
import type { AttendancePolicyResponse, FinalAssessmentBandRequest, FinalAssessmentBandResponse, FinalAssessmentPolicyRequest, FinalAssessmentPolicyResponse } from '#hey-api'
import type { SchemaFor } from '~/utils/validation'
import * as v from 'valibot'
import { getAttendancePolicy, getFinalAssessmentPolicy, updateFinalAssessmentPolicy } from '#hey-api'

definePageMeta({ middleware: 'subject-permission' })

type AttendanceMode = NonNullable<FinalAssessmentPolicyRequest['attendanceMode']>
type AttendanceRequirementMode = NonNullable<FinalAssessmentPolicyRequest['attendanceRequirementMode']>

type FinalAssessmentPolicyForm = Omit<FinalAssessmentPolicyRequest, 'bands'> & { bands: FinalAssessmentBandRequest[] }

// Пороги уровня для оценки достижимости.
// Баллы и процент: пусто = 0 (без ограничения). Задачи: пусто = «все обязательные» —
// строжайшее требование, поэтому считаем его как +∞.
function bandThreshold(b: FinalAssessmentBandRequest): { points: number, percent: number, tasks: number } {
  return {
    points: b.minPoints ?? 0,
    percent: b.minPercent ?? 0,
    tasks: b.requiredTasks ?? Number.POSITIVE_INFINITY,
  }
}

/**
 * Первый недостижимый уровень. Уровень j недостижим, если выше него есть уровень i,
 * чьи условия не строже по всем параметрам (баллы, процент и задачи): тогда любой
 * студент, прошедший j, уже прошёл i, а i выбирается раньше — и j никогда не сработает.
 * Возвращает индексы { lower, upper } либо null, если порядок корректный.
 */
function firstUnreachableBand(bands: FinalAssessmentBandRequest[]): { lower: number, upper: number } | null {
  for (let j = 1; j < bands.length; j++) {
    const bj = bandThreshold(bands[j]!)
    for (let i = 0; i < j; i++) {
      const bi = bandThreshold(bands[i]!)
      if (bi.points <= bj.points && bi.percent <= bj.percent && bi.tasks <= bj.tasks)
        return { lower: j, upper: i }
    }
  }
  return null
}

const BandSchema: SchemaFor<FinalAssessmentBandRequest> = v.object({
  id: v.optional(v.string()),
  label: v.pipe(v.string('Введите ярлык'), v.minLength(1, 'Ярлык обязателен')),
  minPoints: v.optional(v.pipe(v.number(), v.minValue(0))),
  minPercent: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(100))),
  requiredTasks: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
})

const FinalAssessmentPolicySchema: SchemaFor<FinalAssessmentPolicyForm> = v.pipe(
  v.object({
    enabled: v.boolean(),
    bands: v.array(BandSchema),
    attendanceMode: v.picklist(['COMBINED', 'SEPARATE'] as AttendanceMode[], 'Выберите режим посещаемости'),
    attendanceRequirementMode: v.optional(v.picklist(['PERCENT', 'COUNT'] as AttendanceRequirementMode[])),
    attendanceMinPercent: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(100))),
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
    }, 'Добавьте хотя бы один уровень'),
    ['bands'],
  ),
  v.forward(
    v.check(
      (input) => {
        if (!input.enabled)
          return true
        return firstUnreachableBand(input.bands) == null
      },
      (issue) => {
        const bands = (issue.input as FinalAssessmentPolicyForm).bands
        const bad = firstUnreachableBand(bands)
        if (!bad)
          return 'Неверный порядок уровней'
        const lower = bands[bad.lower]?.label || `№${bad.lower + 1}`
        const upper = bands[bad.upper]?.label || `№${bad.upper + 1}`
        return `Уровень «${lower}» недостижим: уровень «${upper}» стоит выше, а его условия не строже. Расположите уровни от самого строгого к самому мягкому.`
      },
    ),
    ['bands'],
  ),
  v.forward(
    v.check((input) => {
      if (input.attendanceMode !== 'SEPARATE')
        return true
      return !!input.attendanceRequirementMode
    }, 'Выберите режим требования'),
    ['attendanceRequirementMode'],
  ),
  v.forward(
    v.check((input) => {
      if (input.attendanceMode !== 'SEPARATE' || input.attendanceRequirementMode !== 'PERCENT')
        return true
      return input.attendanceMinPercent != null
    }, 'Укажите минимальный процент'),
    ['attendanceMinPercent'],
  ),
  v.forward(
    v.check((input) => {
      if (input.attendanceMode !== 'SEPARATE' || input.attendanceRequirementMode !== 'COUNT')
        return true
      return input.attendanceMinCount != null
    }, 'Укажите минимальное количество'),
    ['attendanceMinCount'],
  ),
)

const route = useRoute()
const subjectId = String(route.params.uuid ?? '')

const { data, pending, error, refresh } = useApi(
  { key: `final-assessment-policy:${subjectId}` },
  () => getFinalAssessmentPolicy({ path: { subjectId } }),
)

const { data: attendancePolicyData } = useApi(
  { key: `final-attendance-policy:${subjectId}` },
  () => getAttendancePolicy({ path: { subjectId } }),
)

const policy = computed<FinalAssessmentPolicyResponse | null>(() => data.value ?? null)
const attendancePolicy = computed<AttendancePolicyResponse | null>(() => attendancePolicyData.value ?? null)
const attendancePolicyEnabled = computed(() => attendancePolicy.value?.enabled === true)

const { state, formRef, loading, onSubmit, onError } = useResourceForm<typeof FinalAssessmentPolicySchema>({
  initialState: () => ({
    enabled: false,
    bands: [] as FinalAssessmentBandRequest[],
    attendanceMode: 'COMBINED' as AttendanceMode,
    attendanceRequirementMode: undefined as AttendanceRequirementMode | undefined,
    attendanceMinPercent: undefined as number | undefined,
    attendanceMinCount: undefined as number | undefined,
    attendanceCountPresent: false,
    attendanceCountLate: false,
    attendanceCountAbsent: false,
    attendanceCountExcused: false,
  }),
  successMessage: 'Политика сохранена',
})

function bandFromResponse(b: FinalAssessmentBandResponse | undefined): FinalAssessmentBandRequest {
  return {
    id: b?.id,
    label: b?.label ?? '',
    minPoints: b?.minPoints ?? undefined,
    minPercent: b?.minPercent ?? undefined,
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
    state.attendanceRequirementMode = p.attendanceRequirementMode ?? undefined
    state.attendanceMinPercent = p.attendanceMinPercent ?? undefined
    state.attendanceMinCount = p.attendanceMinCount ?? undefined
    state.attendanceCountPresent = p.attendanceCountPresent ?? false
    state.attendanceCountLate = p.attendanceCountLate ?? false
    state.attendanceCountAbsent = p.attendanceCountAbsent ?? false
    state.attendanceCountExcused = p.attendanceCountExcused ?? false
  },
  { immediate: true },
)

function addBand() {
  state.bands.push({ label: '', minPoints: undefined, minPercent: undefined, requiredTasks: undefined })
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

const attendanceModeOptions = [
  { value: 'COMBINED' as AttendanceMode, label: 'Включена в балл' },
  { value: 'SEPARATE' as AttendanceMode, label: 'Отдельное требование' },
]

const requirementModeOptions = [
  { value: 'PERCENT' as AttendanceRequirementMode, label: 'Процент посещений' },
  { value: 'COUNT' as AttendanceRequirementMode, label: 'Количество посещений' },
]

const handleSave = onSubmit(
  (data) => {
    const body: FinalAssessmentPolicyRequest = {
      enabled: data.enabled,
      ...(data.enabled
        ? {
            bands: data.bands.map(b => ({
              ...(b.id ? { id: b.id } : {}),
              label: b.label,
              ...(b.minPoints != null ? { minPoints: b.minPoints } : {}),
              ...(b.minPercent != null ? { minPercent: b.minPercent } : {}),
              ...(b.requiredTasks != null ? { requiredTasks: b.requiredTasks } : {}),
            })),
          }
        : {}),
      attendanceMode: data.attendanceMode,
      ...(data.attendanceMode === 'SEPARATE'
        ? {
            attendanceRequirementMode: data.attendanceRequirementMode,
            ...(data.attendanceRequirementMode === 'PERCENT' && data.attendanceMinPercent != null
              ? { attendanceMinPercent: data.attendanceMinPercent }
              : {}),
            ...(data.attendanceRequirementMode === 'COUNT' && data.attendanceMinCount != null
              ? { attendanceMinCount: data.attendanceMinCount }
              : {}),
            attendanceCountPresent: data.attendanceCountPresent,
            attendanceCountLate: data.attendanceCountLate,
            attendanceCountAbsent: data.attendanceCountAbsent,
            attendanceCountExcused: data.attendanceCountExcused,
          }
        : {}),
    }

    return updateFinalAssessmentPolicy({ path: { subjectId }, body })
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
        class="flex flex-col gap-6"
        @submit="handleSave"
        @error="onError"
      >
        <!-- Включение -->
        <UCard :ui="{ body: 'flex flex-col gap-1' }">
          <div class="flex items-center justify-between gap-3">
            <span class="font-semibold text-highlighted">Промежуточная аттестация</span>
            <USwitch v-model="state.enabled" />
          </div>
          <p class="text-sm text-muted">
            Автоматически присваивает каждому студенту итоговый уровень (отметку)
            по набранным баллам, закрытым обязательным задачам и посещаемости.
          </p>
        </UCard>

        <template v-if="state.enabled">
          <!-- Уровни -->
          <UCard :ui="{ header: 'flex items-center justify-between gap-3', body: 'flex flex-col gap-4' }">
            <template #header>
              <div class="flex flex-col">
                <span class="font-semibold text-highlighted">Уровни оценок</span>
                <span class="text-xs text-muted">Сверху вниз — от высшего к низшему</span>
              </div>
              <UButton
                icon="i-lucide-plus"
                label="Добавить уровень"
                color="neutral"
                variant="outline"
                @click="addBand"
              />
            </template>

            <UAlert
              color="neutral"
              variant="soft"
              icon="i-lucide-info"
              title="Как выставляется итог"
            >
              <template #description>
                <div class="flex flex-col gap-1.5">
                  <p>
                    Каждому студенту присваивается <b>самый высокий уровень, условия
                      которого он выполнил</b>: проверка идёт сверху вниз и
                    останавливается на первом подходящем. Кто не дотянул до нижнего —
                    «Не аттестован».
                  </p>
                  <p class="text-muted">
                    Поэтому уровни должны идти от строгого к мягкому. Если выше окажется
                    уровень с более мягкими условиями, нижний станет недостижимым —
                    при сохранении появится подсказка.
                  </p>
                </div>
              </template>
            </UAlert>

            <UFormField name="bands" :ui="{ container: 'flex flex-col gap-3' }">
              <div
                v-if="state.bands.length === 0"
                class="flex flex-col items-center gap-1 rounded-lg border border-dashed border-default py-8 text-center"
              >
                <span class="text-sm text-muted">Нет добавленных уровней</span>
              </div>

              <div
                v-for="(band, index) in state.bands"
                :key="index"
                class="flex flex-col gap-3 rounded-lg border border-default bg-elevated/30 p-4"
              >
                <div class="flex items-center justify-between gap-2">
                  <UBadge
                    :label="`Уровень ${index + 1}`"
                    color="primary"
                    variant="subtle"
                    class="font-semibold"
                  />
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

                <div class="grid gap-3 sm:grid-cols-3">
                  <UFormField :name="`bands.${index}.minPoints`" label="Мин. баллов (опционально)">
                    <UInput
                      v-model.number="band.minPoints"
                      type="number"
                      :min="0"
                      placeholder="Без ограничения"
                      class="w-full"
                    />
                  </UFormField>

                  <UFormField :name="`bands.${index}.minPercent`" label="Мин. процент (опционально)">
                    <UInput
                      v-model.number="band.minPercent"
                      type="number"
                      :min="0"
                      :max="100"
                      placeholder="Без ограничения"
                      class="w-full"
                    />
                    <template #help>
                      Процент от макс. возможного балла (0–100).
                    </template>
                  </UFormField>

                  <UFormField :name="`bands.${index}.requiredTasks`" label="Мин. количество обязательных задач">
                    <UInput
                      v-model.number="band.requiredTasks"
                      type="number"
                      :min="0"
                      placeholder="Все обязательные"
                      class="w-full"
                    />
                    <template #help>
                      Пусто — нужно закрыть все обязательные задачи.
                    </template>
                  </UFormField>
                </div>
              </div>
            </UFormField>
          </UCard>

          <!-- Посещаемость -->
          <UCard :ui="{ body: 'flex flex-col gap-4' }">
            <template #header>
              <div class="flex flex-col">
                <span class="font-semibold text-highlighted">Посещаемость</span>
                <span class="text-xs text-muted">В балл или как отдельный порог-допуск</span>
              </div>
            </template>

            <UFormField
              name="attendanceMode"
              label="Как учитывать посещаемость"
              required
            >
              <USelect
                v-model="state.attendanceMode"
                :items="attendanceModeOptions"
                class="w-full"
              />
              <template #help>
                «Включена в балл» — посещаемость просто добавляет баллы к итогу
                (по «Политике учёта посещаемости»). «Отдельное требование» — это
                порог-допуск: не набрал нужный процент или число посещений — «Не
                аттестован», даже если баллов и задач хватает.
              </template>
            </UFormField>

            <UAlert
              v-if="state.attendanceMode === 'COMBINED'"
              :color="attendancePolicyEnabled ? 'primary' : 'warning'"
              variant="soft"
              icon="i-lucide-info"
              :title="attendancePolicyEnabled ? 'Посещаемость войдёт в итог' : 'Политика учёта посещаемости не включена'"
              :description="attendancePolicyEnabled
                ? 'Баллы за посещаемость прибавятся к общему баллу студента согласно «Политике учёта посещаемости».'
                : 'Этот режим работает, только если включена «Политика учёта посещаемости» в настройках предмета — иначе посещаемость в итог не попадёт.'"
            />

            <template v-if="state.attendanceMode === 'SEPARATE'">
              <UFormField name="attendanceRequirementMode" label="Требование к посещаемости" required>
                <USelect
                  v-model="state.attendanceRequirementMode"
                  :items="requirementModeOptions"
                  placeholder="Выберите режим"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                v-if="state.attendanceRequirementMode === 'PERCENT'"
                name="attendanceMinPercent"
                label="Минимальный процент посещений"
                required
              >
                <UInput
                  v-model.number="state.attendanceMinPercent"
                  type="number"
                  :min="0"
                  :max="100"
                  placeholder="0–100"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                v-if="state.attendanceRequirementMode === 'COUNT'"
                name="attendanceMinCount"
                label="Минимальное количество посещений"
                required
              >
                <UInput
                  v-model.number="state.attendanceMinCount"
                  type="number"
                  :min="0"
                  placeholder="Количество занятий"
                  class="w-full"
                />
              </UFormField>

              <div class="flex flex-col gap-2">
                <span class="text-sm font-medium text-default">Засчитывать как посещение</span>
                <p class="text-sm text-muted">
                  Отметьте статусы, которые считаются «посещением» при проверке порога.
                  Например, опоздание можно засчитывать наравне с присутствием, а
                  отсутствие — нет.
                </p>
                <div class="flex flex-wrap gap-4">
                  <UCheckbox v-model="state.attendanceCountPresent" label="Присутствие" />
                  <UCheckbox v-model="state.attendanceCountLate" label="Опоздание" />
                  <UCheckbox v-model="state.attendanceCountAbsent" label="Отсутствие" />
                  <UCheckbox v-model="state.attendanceCountExcused" label="По уважительной причине" />
                </div>
              </div>
            </template>
          </UCard>
        </template>

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
