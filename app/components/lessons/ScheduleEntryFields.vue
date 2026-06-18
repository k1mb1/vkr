<script setup lang="ts">
import type { ScheduleEntry } from '~/composables/useBulkScheduleForm'
import {
  generateScheduleDates,
  scheduleToDays,
  validateSchedule,
  weekdayIndex,
  WEEKDAYS,
} from '~/composables/useBulkScheduleForm'

const props = defineProps<{
  schedule: ScheduleEntry
  count: number
}>()

const { d } = useI18n()
const entry = props.schedule

// Дата первой пары задаёт «якорь»: её день недели обязательно входит в первую
// неделю и является в ней самым ранним. Раньше якоря дни первой недели запрещены.
const anchorIdx = computed(() => weekdayIndex(entry.firstLessonDate))

function normalizeAnchor() {
  const a = anchorIdx.value
  const week0 = entry.weeks[0]
  if (a == null || !week0)
    return
  for (let i = 0; i < 7; i++) {
    if (i < a)
      week0[i] = false
  }
  week0[a] = true
}

function dayDisabled(weekIndex: number, dayIdx: number): boolean {
  return weekIndex === 0 && anchorIdx.value != null && dayIdx <= anchorIdx.value
}

function toggleDay(weekIndex: number, dayIdx: number) {
  if (dayDisabled(weekIndex, dayIdx))
    return
  const week = entry.weeks[weekIndex]
  if (week)
    week[dayIdx] = !week[dayIdx]
}

function addWeek() {
  entry.weeks.push(Array.from<boolean>({ length: 7 }).fill(false))
}

function removeWeek(weekIndex: number) {
  if (entry.weeks.length <= 1 || weekIndex === 0)
    return
  entry.weeks.splice(weekIndex, 1)
}

const previewDates = computed(() =>
  generateScheduleDates(entry.firstLessonDate, props.count, scheduleToDays(entry)),
)

const errors = computed(() =>
  validateSchedule({
    firstLessonDate: entry.firstLessonDate,
    count: props.count,
    days: scheduleToDays(entry),
    checkCount: false,
  }),
)

function formatPreview(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`)
  const idx = weekdayIndex(date)
  const short = idx != null ? WEEKDAYS[idx]?.short : ''
  return `${short}, ${d(parsed, 'dayMonth')}`
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <UFormField label="Дата первой пары" required>
      <UInput
        v-model="entry.firstLessonDate"
        type="date"
        class="w-48"
        @update:model-value="normalizeAnchor"
      />
    </UFormField>

    <UFormField label="Недельный шаблон" required>
      <div class="flex flex-col gap-2">
        <div
          v-for="(week, w) in entry.weeks"
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

    <UFormField v-else-if="previewDates.length" :label="`Предпросмотр проведений (${previewDates.length})`">
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
  </div>
</template>
