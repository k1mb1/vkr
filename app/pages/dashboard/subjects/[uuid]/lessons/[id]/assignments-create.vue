<script setup lang="ts">
import type { InferOutput } from 'valibot'
import type { AssignmentResponse, CreateAssignmentsRequest, FinalAssessmentBandResponse, LessonResponse } from '#hey-api'
import * as v from 'valibot'
import { createAssignments, getFinalAssessmentPolicy } from '#hey-api'
import { arrayMinLength } from '~/utils/validation'

definePageMeta({ middleware: 'subject-permission' })

type AdmissionMode = NonNullable<AssignmentResponse['admissionMode']>

const ItemSchema = v.pipe(
  v.object({
    id: v.string(),
    lessonId: v.string(),
    order: v.pipe(v.number(), v.integer(), v.minValue(0)),
    maxPoints: v.pipe(
      v.union(
        [v.number(), v.pipe(v.string(), v.transform(Number))],
        'Введите число',
      ),
      v.number('Введите число'),
      v.integer('Только целое число'),
      v.minValue(1, 'Минимум 1 балл'),
    ),
    required: v.boolean(),
    admissionMode: v.picklist(['NONE', 'PASS_FAIL', 'MIN_SCORE', 'TIERED']),
    admissionMinScore: v.pipe(v.number(), v.minValue(0)),
    admissionTiers: v.array(
      v.object({
        bandId: v.pipe(v.string(), v.minLength(1)),
        minScore: v.pipe(v.number(), v.minValue(0)),
      }),
    ),
  }),
  v.forward(
    v.check((input) => {
      if (input.admissionMode === 'NONE' || input.admissionMode === 'PASS_FAIL')
        return true
      if (input.admissionMode === 'TIERED')
        return input.admissionTiers.length > 0
      return input.admissionMinScore != null
    }, 'Заполните условия допуска'),
    ['admissionMinScore'],
  ),
  v.forward(
    v.check((input) => {
      if (input.admissionMode !== 'TIERED')
        return true
      return input.admissionTiers.length > 0
    }, 'Нет доступных банд для уровней допуска'),
    ['admissionTiers'],
  ),
)

type AssignmentItemForm = InferOutput<typeof ItemSchema>

const CreateAssignmentsSchema = v.object({
  lessonId: v.string(),
  items: arrayMinLength(ItemSchema, 1, 'Добавьте хотя бы одно задание'),
})

const route = useRoute()
const subjectId = String(route.params.uuid ?? '')
const lessonId = String(route.params.id ?? '')

const targetLesson = (history.state?.lesson ?? null) as LessonResponse | null

// ── Policy for bands ────────────────────────────────────────────────────────
const { data: policyData } = useApi(
  { key: `final-assessment-policy:${subjectId}` },
  () => getFinalAssessmentPolicy({ path: { subjectId } }),
)

const bands = computed<FinalAssessmentBandResponse[]>(() => policyData.value?.bands ?? [])
const policyEnabled = computed(() => policyData.value?.enabled ?? false)

// ── Helpers ─────────────────────────────────────────────────────────────────
function ensureTiers(item: AssignmentItemForm) {
  if (item.admissionMode !== 'TIERED')
    return
  const existing = new Map(item.admissionTiers.map(t => [t.bandId, t.minScore]))
  item.admissionTiers = bands.value.map(b => ({
    bandId: b.id ?? '',
    minScore: existing.get(b.id ?? '') ?? 0,
  })).filter(t => t.bandId)
}

// ── Form ────────────────────────────────────────────────────────────────────
const { state, formRef, loading, onSubmit, onError } = useResourceForm<typeof CreateAssignmentsSchema>({
  initialState: () => ({
    lessonId,
    items: [{ id: '', lessonId: '', order: 0, maxPoints: 10, required: true, admissionMode: 'NONE' as AdmissionMode, admissionMinScore: 0, admissionTiers: [] }],
  }),
})

function addItem() {
  state.items.push({ id: '', lessonId: '', order: 0, maxPoints: 10, required: true, admissionMode: 'NONE', admissionMinScore: 0, admissionTiers: [] })
}

watch(bands, () => {
  for (const item of state.items) {
    ensureTiers(item)
  }
}, { immediate: true })

watch(
  () => state.items,
  (items) => {
    for (const item of items) {
      if (item.admissionMode !== 'NONE')
        item.required = false
    }
  },
  { deep: true },
)

function removeItem(idx: number) {
  state.items.splice(idx, 1)
}

const totalMaxPoints = computed(() =>
  state.items.reduce((sum, it) => sum + (Number(it.maxPoints) || 0), 0),
)

const modeOptions = [
  { value: 'NONE' as const, label: 'Нет' },
  { value: 'PASS_FAIL' as const, label: 'Сдал / не сдал' },
  { value: 'MIN_SCORE' as const, label: 'Мин. балл' },
  { value: 'TIERED' as const, label: 'По уровням' },
]

const handleCreate = onSubmit(
  (data) => {
    const body = {
      lessonId: data.lessonId,
      items: data.items.map(item => ({
        maxPoints: item.maxPoints,
        required: item.required,
        order: 0,
        id: '',
        admissionMode: item.admissionMode,
        ...(item.admissionMode === 'MIN_SCORE'
          ? { admissionMinScore: item.admissionMinScore ?? 0 }
          : {}),
        ...(item.admissionMode === 'TIERED'
          ? {
              admissionTiers: item.admissionTiers.map(t => ({
                bandId: t.bandId,
                minScore: t.minScore,
              })),
            }
          : {}),
      })),
    }

    return createAssignments({ body: body as unknown as CreateAssignmentsRequest })
  },
  {
    successMessage: result => (result?.length ?? 0) > 1
      ? `Создано заданий: ${result!.length}`
      : 'Задание создано',
    onSuccess: () => navigateTo(`/dashboard/subjects/${subjectId}/lessons`),
  },
)
</script>

<template>
  <div class="flex flex-col gap-4">
    <UPageHeader
      title="Добавить задания"
      :description="targetLesson?.topic
        ? `Занятие: ${targetLesson.topic}`
        : 'Задания создаются один раз, порядок — в соответствии со списком ниже.'"
    >
      <template #links>
        <UButton
          :to="`/dashboard/subjects/${subjectId}/lessons`"
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="ghost"
          label="Назад"
        />
      </template>
    </UPageHeader>

    <UAlert
      color="neutral"
      variant="soft"
      icon="i-lucide-info"
      title="Как добавить задания"
    >
      <template #description>
        <div class="flex flex-col gap-1.5">
          <p>
            Для каждого задания укажите максимум баллов. Отметьте <b>обязательное</b>,
            если оно должно быть закрыто для аттестации.
          </p>
          <p class="text-muted">
            <b>Режим допуска</b> задаёт условие, по которому задание влияет на допуск:
            «Нет» — обычное задание; «Сдал / не сдал» — по факту сдачи; «Мин. балл» —
            нужно набрать минимум; «По уровням» — свой минимум под каждый итоговый уровень.
          </p>
        </div>
      </template>
    </UAlert>

    <UAlert
      v-if="!policyEnabled"
      color="warning"
      variant="soft"
      icon="i-lucide-triangle-alert"
      title="Итоговая аттестация не настроена"
      description="Режим допуска «По уровням» будет недоступен, пока не созданы итоговые уровни в настройках предмета."
    />

    <UForm
      ref="formRef"
      :schema="CreateAssignmentsSchema"
      :state="state"
      class="flex flex-col gap-4"
      @submit="handleCreate"
      @error="onError"
    >
      <UFormField name="items" />

      <div class="flex flex-col gap-2">
        <UCard
          v-for="(item, idx) in state.items"
          :key="idx"
          :ui="{ body: 'flex flex-col gap-4 p-4' }"
        >
          <div class="flex items-start gap-3">
            <span class="mt-5 w-8 shrink-0 text-sm font-medium text-muted">
              №{{ idx + 1 }}
            </span>

            <div class="flex flex-1 flex-wrap items-start gap-3">
              <UFormField
                label="Макс. баллов"
                :name="`items.${idx}.maxPoints`"
                required
                class="w-32"
              >
                <UInput
                  v-model.number="item.maxPoints"
                  type="number"
                  :min="1"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                v-if="item.admissionMode === 'NONE'"
                label="Обязательное"
                :name="`items.${idx}.required`"
                class="mt-5"
              >
                <UCheckbox v-model="item.required" label="Да" />
              </UFormField>

              <UFormField
                label="Режим допуска"
                :name="`items.${idx}.admissionMode`"
                required
                class="w-44"
              >
                <USelect
                  v-model="item.admissionMode"
                  :items="modeOptions"
                  class="w-full"
                  @update:model-value="ensureTiers(item)"
                />
              </UFormField>

              <UButton
                class="mt-5"
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                :disabled="state.items.length <= 1"
                :aria-label="`Удалить задание №${idx + 1}`"
                @click="removeItem(idx)"
              />
            </div>
          </div>

          <!-- MIN_SCORE -->
          <div v-if="item.admissionMode === 'MIN_SCORE'" class="pl-11">
            <UFormField
              :name="`items.${idx}.admissionMinScore`"
              label="Мин. балл для допуска"
              required
              class="w-40"
            >
              <UInput
                :model-value="item.admissionMinScore"
                type="number"
                :min="0"
                :max="item.maxPoints"
                class="w-full"
                @update:model-value="v => item.admissionMinScore = v == null ? 0 : Number(v)"
              />
            </UFormField>
          </div>

          <!-- TIERED -->
          <div v-if="item.admissionMode === 'TIERED'" class="flex flex-col gap-3 pl-11">
            <p
              v-if="bands.length === 0"
              class="text-sm text-muted italic"
            >
              Нет доступных уровней. Создайте итоговые уровни в настройках предмета.
            </p>

            <div
              v-for="(tier, tIdx) in item.admissionTiers"
              :key="tier.bandId"
              class="flex items-center gap-3"
            >
              <UBadge
                :label="bands.find(b => b.id === tier.bandId)?.label ?? '—'"
                color="primary"
                variant="subtle"
                class="shrink-0"
              />

              <UFormField
                :name="`items.${idx}.admissionTiers.${tIdx}.minScore`"
                label="Мин. балл"
                required
                class="w-32"
              >
                <UInput
                  v-model.number="tier.minScore"
                  type="number"
                  :min="0"
                  :max="item.maxPoints"
                  class="w-full"
                />
              </UFormField>
            </div>
          </div>
        </UCard>

        <UButton
          icon="i-lucide-plus"
          color="neutral"
          variant="outline"
          class="self-start"
          @click="addItem"
        >
          Добавить задание
        </UButton>
      </div>

      <div class="flex items-center justify-between gap-2">
        <span class="text-sm text-muted">
          Заданий: {{ state.items.length }} · Сумма баллов: {{ totalMaxPoints }}
        </span>
        <div class="flex gap-2">
          <UButton
            :to="`/dashboard/subjects/${subjectId}/lessons`"
            color="neutral"
            variant="ghost"
            type="button"
          >
            Отмена
          </UButton>
          <UButton type="submit" icon="i-lucide-check" :loading="loading">
            Создать
          </UButton>
        </div>
      </div>
    </UForm>
  </div>
</template>
