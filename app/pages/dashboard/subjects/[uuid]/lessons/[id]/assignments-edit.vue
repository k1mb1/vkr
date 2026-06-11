<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'
import type { SchemaFor } from '~/utils/validation'
import * as v from 'valibot'

definePageMeta({ middleware: 'subject-permission' })

type LessonResponse = components['schemas']['LessonResponse']
type AssignmentResponse = components['schemas']['AssignmentResponse']
type Band = components['schemas']['Band']

type AdmissionMode = NonNullable<AssignmentResponse['admissionMode']>

type AssignmentForm = Required<AssignmentResponse> & {
  admissionTiers: { bandId: string, minScore: number }[]
}

const AssignmentSchema: SchemaFor<AssignmentForm> = v.pipe(
  v.object({
    id: v.string(),
    lessonId: v.string(),
    order: v.pipe(v.number(), v.integer(), v.minValue(1)),
    maxPoints: v.pipe(v.number(), v.integer(), v.minValue(1, 'Минимум 1 балл')),
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

const FormSchema: SchemaFor<{ items: AssignmentForm[] }> = v.object({
  items: v.array(AssignmentSchema),
})

const route = useRoute()
const subjectId = String(route.params.uuid ?? '')
const lessonId = String(route.params.id ?? '')

const targetLesson = (history.state?.lesson ?? null) as LessonResponse | null

const { $backend } = useNuxtApp()

// ── Load lesson if not seeded ───────────────────────────────────────────────
const { data: fetchedLesson, pending: lessonPending } = useBackend('/api/lessons/{id}', {
  method: 'GET',
  path: { id: lessonId },
  immediate: !targetLesson,
})

const lesson = computed<LessonResponse | null>(() => targetLesson ?? fetchedLesson.value ?? null)
const assignments = computed<AssignmentResponse[]>(() => lesson.value?.assignments ?? [])

// ── Load policy for bands ───────────────────────────────────────────────────
const { data: policyData, pending: policyPending } = useBackend('/api/final-assessment-policy/subjects/{subjectId}', {
  method: 'GET',
  path: { subjectId },
})

const bands = computed<Band[]>(() => policyData.value?.bands ?? [])
const policyEnabled = computed(() => policyData.value?.enabled ?? false)

// ── Helpers ─────────────────────────────────────────────────────────────────
function ensureTiers(item: AssignmentForm) {
  if (item.admissionMode !== 'TIERED')
    return
  const existing = new Map(item.admissionTiers.map(t => [t.bandId, t.minScore]))
  item.admissionTiers = bands.value.map(b => ({
    bandId: b.id ?? '',
    minScore: existing.get(b.id ?? '') ?? 0,
  })).filter(t => t.bandId)
}

// ── Form ────────────────────────────────────────────────────────────────────
function assignmentFromResponse(a: AssignmentResponse): AssignmentForm {
  return {
    id: a.id ?? '',
    lessonId: a.lessonId ?? '',
    order: a.order ?? 0,
    maxPoints: a.maxPoints ?? 1,
    required: a.required ?? false,
    admissionMode: (a.admissionMode as AdmissionMode) ?? 'NONE',
    admissionMinScore: a.admissionMinScore ?? 0,
    admissionTiers: (a.admissionTiers ?? []).map(t => ({
      bandId: t.bandId ?? '',
      minScore: t.minScore ?? 0,
    })),
  }
}

const { state, formRef, loading, onSubmit, onError } = useResourceForm<typeof FormSchema>({
  initialState: () => ({ items: [] as AssignmentForm[] }),
  successMessage: 'Задания обновлены',
})

watch(bands, () => {
  for (const item of state.items) {
    ensureTiers(item)
  }
}, { immediate: true })

watch(
  assignments,
  (list) => {
    state.items = list.map(assignmentFromResponse)
    for (const item of state.items) {
      ensureTiers(item)
    }
  },
  { immediate: true },
)

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

const modeOptions = [
  { value: 'NONE' as const, label: 'Нет' },
  { value: 'PASS_FAIL' as const, label: 'Сдал / не сдал' },
  { value: 'MIN_SCORE' as const, label: 'Мин. балл' },
  { value: 'TIERED' as const, label: 'По уровням' },
]

function modeLabel(mode: AssignmentForm['admissionMode']) {
  return modeOptions.find(o => o.value === mode)?.label ?? mode
}

function addItem() {
  const nextOrder = state.items.reduce((max, it) => Math.max(max, it.order), 0) + 1
  state.items.push({
    id: '',
    lessonId,
    order: nextOrder,
    maxPoints: 10,
    required: true,
    admissionMode: 'NONE',
    admissionMinScore: 0,
    admissionTiers: [],
  })
}

function removeItem(idx: number) {
  state.items.splice(idx, 1)
  state.items.forEach((it, i) => {
    it.order = i + 1
  })
}

const handleSave = onSubmit(
  (data) => {
    const body = {
      items: data.items.map((item, idx) => ({
        id: item.id,
        order: idx + 1,
        maxPoints: item.maxPoints,
        required: item.required,
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

    return $backend('/api/assignments/lessons/{lessonId}', {
      method: 'PUT',
      path: { lessonId },
      body: body as unknown as components['schemas']['BulkUpdateAssignmentsRequest'],
    })
  },
  {
    onSuccess: () => navigateTo(`/dashboard/subjects/${subjectId}/lessons/${lessonId}`),
  },
)

const isReady = computed(() => !!lesson.value)
</script>

<template>
  <div class="flex flex-col gap-4">
    <UPageHeader
      title="Настройка заданий"
      :description="lesson?.topic
        ? `Занятие: ${lesson.topic}`
        : 'Редактирование заданий и условий допуска к итоговой аттестации.'"
    >
      <template #links>
        <UButton
          :to="`/dashboard/subjects/${subjectId}/lessons/${lessonId}`"
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="ghost"
          label="Назад"
        />
      </template>
    </UPageHeader>

    <template v-if="lessonPending && !lesson">
      <USkeleton class="h-8 w-1/3" />
      <USkeleton class="h-24 w-full" />
      <USkeleton class="h-24 w-full" />
    </template>

    <UAlert
      v-else-if="!isReady"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Занятие не найдено"
      description="Откройте занятие из списка."
    />

    <template v-else>
      <UAlert
        color="neutral"
        variant="soft"
        icon="i-lucide-info"
        title="Настройка заданий"
      >
        <template #description>
          <div class="flex flex-col gap-1.5">
            <p>
              Для каждого задания задайте максимум баллов. Отметьте <b>обязательное</b>,
              если оно должно быть закрыто для аттестации.
            </p>
            <p class="text-muted">
              <b>Режим допуска</b> задаёт условие влияния на допуск: «Нет» — обычное
              задание; «Сдал / не сдал» — по факту сдачи; «Мин. балл» — нужно набрать
              минимум; «По уровням» — свой минимум под каждый итоговый уровень.
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
        description="Режим допуска «По уровням» недоступен, пока не созданы итоговые уровни в настройках предмета → «Промежуточная аттестация»."
      />

      <UForm
        ref="formRef"
        :schema="FormSchema"
        :state="state"
        class="flex flex-col gap-4"
        @submit="handleSave"
        @error="onError"
      >
        <UFormField name="items" />

        <div v-if="state.items.length === 0" class="text-sm text-muted italic">
          У этого занятия нет заданий.
        </div>

        <UCard
          v-for="(item, idx) in state.items"
          :key="`${idx}-${item.id}`"
          :ui="{ body: 'flex flex-col gap-4' }"
        >
          <div class="flex items-center justify-between">
            <span class="font-semibold text-default">
              Задание №{{ item.order }}
            </span>
            <div class="flex items-center gap-2">
              <UBadge
                :label="modeLabel(item.admissionMode)"
                :color="item.admissionMode === 'NONE' ? 'neutral' : 'primary'"
                variant="subtle"
              />
              <UButton
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                aria-label="Удалить задание"
                @click="removeItem(idx)"
              />
            </div>
          </div>

          <div class="grid gap-4 sm:grid-cols-3">
            <UFormField
              :name="`items.${idx}.maxPoints`"
              label="Макс. баллов"
              required
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
              :name="`items.${idx}.required`"
              label="Обязательное"
            >
              <UCheckbox v-model="item.required" label="Да" />
            </UFormField>

            <UFormField
              :name="`items.${idx}.admissionMode`"
              label="Режим допуска"
              required
            >
              <USelect
                v-model="item.admissionMode"
                :items="modeOptions"
                class="w-full"
                @update:model-value="ensureTiers(item)"
              />
            </UFormField>
          </div>

          <!-- MIN_SCORE -->
          <div v-if="item.admissionMode === 'MIN_SCORE'">
            <UFormField
              :name="`items.${idx}.admissionMinScore`"
              label="Мин. балл для допуска"
              required
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
          <div v-if="item.admissionMode === 'TIERED'" class="flex flex-col gap-3">
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

        <div class="flex items-center justify-between gap-2">
          <UButton
            icon="i-lucide-plus"
            color="neutral"
            variant="outline"
            label="Добавить задание"
            @click="addItem"
          />
          <span class="text-sm text-muted">
            Заданий: {{ state.items.length }}
          </span>
          <div class="flex gap-2">
            <UButton
              :to="`/dashboard/subjects/${subjectId}/lessons/${lessonId}`"
              color="neutral"
              variant="ghost"
              type="button"
            >
              Отмена
            </UButton>
            <UButton
              type="submit"
              icon="i-lucide-check"
              :loading="loading || policyPending"
            >
              Сохранить
            </UButton>
          </div>
        </div>
      </UForm>
    </template>
  </div>
</template>
