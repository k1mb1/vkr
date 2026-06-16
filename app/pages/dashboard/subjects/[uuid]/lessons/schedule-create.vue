<script setup lang="ts">
import type { BulkScheduleAudience, BulkScheduleRequest } from '~/composables/useBulkScheduleForm'
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
const { $backend } = useNuxtApp()
const { permission } = usePermissions()
const { loading, submit } = useFormSubmit()

// ── Form state ───────────────────────────────────────────
function emptyWeek(): boolean[] {
  return Array.from<boolean>({ length: 7 }).fill(false)
}

const state = reactive({
  lessonType: 'PRACTICE' as BulkScheduleRequest['lessonType'],
  firstLessonDate: '',
  count: 1,
  // Недельный шаблон: внешний массив — недели, внутренний (длина 7) — дни пн…вс.
  weeks: [emptyWeek()] as boolean[][],
  audienceMode: 'all' as 'all' | 'groups',
})

// ── Groups for audience ──────────────────────────────────
const { data: groups, pending: groupsPending } = useBackend('/api/groups/by-subject', {
  method: 'GET',
  query: { subjectId },
})

interface GroupAudienceEntry {
  groupId: string
  groupName: string
  subgroups: { id: string, index: number }[]
  /** если true — на каждую подгруппу создаётся своё проведение */
  splitBySubgroups: boolean
}

const groupEntries = ref<GroupAudienceEntry[]>([])

watch(groups, (val) => {
  groupEntries.value = (val ?? []).map(g => ({
    groupId: g.id!,
    groupName: g.name ?? g.id ?? '',
    subgroups: (g.subgroups ?? []).map(s => ({ id: s.id!, index: s.index ?? 0 })),
    splitBySubgroups: false,
  }))
}, { immediate: true })

// Аудитории по выбранным группам: целая группа — одна аудитория, разбивка по
// подгруппам — по одной аудитории на каждую подгруппу.
const audiences = computed<BulkScheduleAudience[]>(() => {
  const out: BulkScheduleAudience[] = []
  for (const entry of groupEntries.value) {
    if (entry.splitBySubgroups && entry.subgroups.length) {
      for (const sub of entry.subgroups)
        out.push({ groupId: entry.groupId, allowedSubgroupId: sub.id })
    }
    else {
      out.push({ groupId: entry.groupId })
    }
  }
  return out
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
  state.audienceMode === 'groups' && groupEntries.value.length === 0
    ? 'К предмету не привязаны группы'
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
    // null/пустой список аудиторий = все группы предмета.
    audiences: state.audienceMode === 'all' ? undefined : audiences.value,
  }

  await submit(
    () => $backend('/api/lessons/bulk-schedule', {
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
        description="Создаётся одно занятие и серия проведений по недельному шаблону. Укажите дату первой пары, число проведений, дни недели и аудиторию. Несколько недель в шаблоне нужны для чередования (например, раз в две недели: дни в 1-й неделе, пустая 2-я). Аудитория «Выбранные группы» создаёт отдельные проведения на каждую группу (с разбивкой по подгруппам — на каждую подгруппу)."
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
              { value: 'groups', label: 'Выбранные группы' },
            ]"
          />
        </UFormField>

        <template v-if="state.audienceMode === 'groups'">
          <div v-if="groupsPending && groupEntries.length === 0" class="flex flex-col gap-3">
            <USkeleton v-for="i in 3" :key="i" class="h-16" />
          </div>

          <UEmpty
            v-else-if="!groupsPending && groupEntries.length === 0"
            icon="i-lucide-users"
            title="Нет групп"
            description="К этому предмету не привязаны группы"
            variant="naked"
            class="py-4"
          />

          <div v-else class="flex flex-col gap-3">
            <UCard
              v-for="entry in groupEntries"
              :key="entry.groupId"
              :ui="{ body: 'p-4' }"
            >
              <div class="flex flex-col gap-2">
                <div class="font-medium">
                  {{ entry.groupName }}
                </div>
                <UCheckbox
                  v-if="entry.subgroups.length > 0"
                  v-model="entry.splitBySubgroups"
                  label="Разбить по подгруппам (отдельное проведение на каждую)"
                />
              </div>
            </UCard>
          </div>
        </template>

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
