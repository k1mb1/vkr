<script setup lang="ts">
import type {
  BulkScheduleRequest,
  BulkScheduleResponse,
} from '~/composables/useBulkScheduleForm'
import {
  generateScheduleDates,
  validateSchedule,
  weekdayIndex,
  WEEKDAYS,
} from '~/composables/useBulkScheduleForm'

definePageMeta({ middleware: 'subject-permission' })

const route = useRoute()
const subjectId = String(route.params.uuid ?? '')

const { d } = useI18n()
const { permission } = usePermissions()
const { loading, submit } = useFormSubmit()

// ── Form state ───────────────────────────────────────────
function emptyWeek(): boolean[] {
  return Array.from<boolean>({ length: 7 }).fill(false)
}

const state = reactive({
  lessonType: 'PRACTICE' as 'LECTURE' | 'PRACTICE',
  firstLessonDate: '',
  count: 1,
  // Недельный шаблон: внешний массив — недели, внутренний (длина 7) — дни пн…вс.
  weeks: [emptyWeek()] as boolean[][],
  audienceMode: 'all' as 'all' | 'group',
  groupId: '',
  subgroupId: undefined as string | undefined,
})

// ── Groups for audience ──────────────────────────────────
const { data: groups, pending: groupsPending } = useBackend('/api/groups/by-subject', {
  method: 'GET',
  query: { subjectId },
})

const groupOptions = computed(() =>
  (groups.value ?? []).map(g => ({ label: g.name ?? g.id ?? '', value: g.id! })),
)

const selectedGroup = computed(() =>
  (groups.value ?? []).find(g => g.id === state.groupId) ?? null,
)

const subgroupOptions = computed(() =>
  (selectedGroup.value?.subgroups ?? []).map(s => ({
    label: `Подгруппа ${s.index ?? ''}`.trim(),
    value: s.id!,
  })),
)

watch(() => state.groupId, () => {
  state.subgroupId = undefined
})

// ── Weekly pattern ───────────────────────────────────────
const anchorIdx = computed(() => weekdayIndex(state.firstLessonDate))

// Дата первой пары задаёт «якорь»: её день недели обязательно входит в первую
// неделю и является в ней самым ранним. Раньше якоря дни первой недели запрещены.
watch(() => state.firstLessonDate, () => {
  const a = anchorIdx.value
  const week0 = state.weeks[0]
  if (a == null || !week0)
    return
  for (let i = 0; i < 7; i++) {
    if (i < a)
      week0[i] = false
  }
  week0[a] = true
})

function dayDisabled(weekIndex: number, dayIdx: number): boolean {
  return weekIndex === 0 && anchorIdx.value != null && dayIdx <= anchorIdx.value
}

function toggleDay(weekIndex: number, dayIdx: number) {
  if (dayDisabled(weekIndex, dayIdx))
    return
  const week = state.weeks[weekIndex]
  if (week)
    week[dayIdx] = !week[dayIdx]
}

function addWeek() {
  state.weeks.push(emptyWeek())
}

function removeWeek(weekIndex: number) {
  if (state.weeks.length <= 1 || weekIndex === 0)
    return
  state.weeks.splice(weekIndex, 1)
}

const daysPayload = computed(() =>
  state.weeks.map(week => WEEKDAYS.filter((_, i) => week[i]).map(d => d.value)),
)

// ── Preview & validation ─────────────────────────────────
const previewDates = computed(() =>
  generateScheduleDates(state.firstLessonDate, state.count, daysPayload.value),
)

const scheduleErrors = computed(() => validateSchedule({
  firstLessonDate: state.firstLessonDate,
  count: state.count,
  days: daysPayload.value,
}))

const audienceError = computed(() =>
  state.audienceMode === 'group' && !state.groupId
    ? 'Выберите группу'
    : null,
)

const errors = computed(() =>
  [...scheduleErrors.value, ...(audienceError.value ? [audienceError.value] : [])],
)

const canSubmit = computed(() => errors.value.length === 0 && previewDates.value.length > 0)

function formatPreview(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`)
  const idx = weekdayIndex(date)
  const short = idx != null ? WEEKDAYS[idx]?.short : ''
  return `${short}, ${d(parsed, 'dayMonth')}`
}

// ── Submit ───────────────────────────────────────────────
async function handleCreate() {
  if (!canSubmit.value)
    return

  const body: BulkScheduleRequest = {
    subjectId,
    lessonType: state.lessonType,
    firstLessonDate: state.firstLessonDate,
    count: state.count,
    days: daysPayload.value,
    audience: state.audienceMode === 'all'
      ? null
      : { groupId: state.groupId, allowedSubgroupId: state.subgroupId ?? null },
  }

  await submit(
    // Эндпоинта ещё нет в OpenAPI-схеме, поэтому идём напрямую через прокси
    // (он добавляет авторизацию и проверяет Origin так же, как $backend).
    () => $fetch<BulkScheduleResponse>('/api/proxy/api/lessons/bulk-schedule', {
      method: 'POST',
      body,
    }),
    {
      successMessage: result =>
        `Создано занятие с ${result.scopes?.length ?? previewDates.value.length} проведениями`,
      onSuccess: () => navigateTo(`/dashboard/subjects/${subjectId}/lessons`),
    },
  )
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <UPageHeader title="Создать занятие по расписанию">
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
      v-if="!permission"
      color="warning"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Нет назначения"
      description="У вас нет назначения по данному предмету."
    />

    <UAlert
      v-else-if="!permission.allPermissions"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Недостаточно прав"
      description="Создавать занятия могут только преподаватели с доступом ко всем группам предмета."
    />

    <template v-else>
      <UAlert
        color="neutral"
        variant="soft"
        icon="i-lucide-info"
        title="Создание занятия по расписанию"
        description="Создаётся одно занятие и серия проведений по недельному шаблону. Укажите дату первой пары, число проведений и дни недели. Несколько недель в шаблоне нужны для чередования (например, раз в две недели: дни в 1-й неделе, пустая 2-я)."
      />

      <div class="flex flex-col gap-4">
        <UFormField label="Тип занятия" required>
          <URadioGroup
            v-model="state.lessonType"
            orientation="horizontal"
            :items="[
              { value: 'LECTURE', label: 'Лекция' },
              { value: 'PRACTICE', label: 'Практика' },
            ]"
          />
        </UFormField>

        <div class="flex flex-wrap gap-4">
          <UFormField label="Дата первой пары" required>
            <UInput v-model="state.firstLessonDate" type="date" class="w-48" />
          </UFormField>

          <UFormField label="Количество проведений" required>
            <UInput v-model.number="state.count" type="number" :min="1" class="w-40" />
          </UFormField>
        </div>

        <!-- Аудитория -->
        <UFormField label="Аудитория" required>
          <URadioGroup
            v-model="state.audienceMode"
            orientation="horizontal"
            :items="[
              { value: 'all', label: 'Все группы предмета' },
              { value: 'group', label: 'Выбранная группа' },
            ]"
          />
        </UFormField>

        <div v-if="state.audienceMode === 'group'" class="flex flex-wrap gap-4">
          <UFormField label="Группа" required>
            <USelect
              v-model="state.groupId"
              :items="groupOptions"
              value-key="value"
              :loading="groupsPending"
              placeholder="Выберите группу"
              class="w-64"
            />
          </UFormField>

          <UFormField v-if="subgroupOptions.length" label="Подгруппа">
            <USelect
              v-model="state.subgroupId"
              :items="subgroupOptions"
              value-key="value"
              placeholder="Вся группа"
              class="w-48"
            />
          </UFormField>
        </div>

        <!-- Недельный шаблон -->
        <UFormField label="Недельный шаблон" required>
          <div class="flex flex-col gap-2">
            <div
              v-for="(week, w) in state.weeks"
              :key="w"
              class="flex flex-wrap items-center gap-2"
            >
              <span class="text-muted w-20 shrink-0 text-sm">Неделя {{ w + 1 }}</span>
              <div class="flex flex-wrap gap-1">
                <UButton
                  v-for="(day, i) in WEEKDAYS"
                  :key="day.value"
                  :label="day.short"
                  size="sm"
                  :color="week[i] ? 'primary' : 'neutral'"
                  :variant="week[i] ? 'solid' : 'outline'"
                  :disabled="dayDisabled(w, i) && !week[i]"
                  :title="day.label"
                  @click="toggleDay(w, i)"
                />
              </div>
              <UButton
                v-if="w > 0"
                icon="i-lucide-x"
                size="sm"
                color="neutral"
                variant="ghost"
                :aria-label="`Удалить неделю ${w + 1}`"
                @click="removeWeek(w)"
              />
            </div>

            <UButton
              icon="i-lucide-plus"
              label="Добавить неделю"
              size="sm"
              color="neutral"
              variant="ghost"
              class="self-start"
              @click="addWeek"
            />
          </div>
        </UFormField>

        <!-- Ошибки валидации -->
        <UAlert
          v-if="errors.length"
          color="warning"
          variant="soft"
          icon="i-lucide-triangle-alert"
          title="Проверьте параметры"
        >
          <template #description>
            <ul class="list-disc pl-4">
              <li v-for="(err, i) in errors" :key="i">
                {{ err }}
              </li>
            </ul>
          </template>
        </UAlert>

        <!-- Предпросмотр дат -->
        <UFormField v-if="previewDates.length" :label="`Предпросмотр проведений (${previewDates.length})`">
          <div class="flex flex-wrap gap-1.5">
            <UBadge
              v-for="(date, i) in previewDates"
              :key="i"
              :label="formatPreview(date)"
              color="neutral"
              variant="subtle"
            />
          </div>
        </UFormField>

        <UButton
          icon="i-lucide-check"
          :loading="loading"
          :disabled="!canSubmit"
          class="ml-auto"
          @click="handleCreate"
        >
          Создать занятие
        </UButton>
      </div>
    </template>
  </div>
</template>
