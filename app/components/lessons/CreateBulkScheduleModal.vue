<script setup lang="ts">
import type {
  BulkScheduleRequestPayload,
  DayOfWeek,
  LessonResponse,
  LessonType,
} from '#shared/types/backend'
import { bulkScheduleRequestSchema } from '#shared/types/backend'
import { useLessonsApi } from '~/composables/api/useLessonsApi'

interface ApiErrorPayload {
  statusMessage?: string
  message?: string
}

interface ApiErrorShape {
  message?: string
  data?: ApiErrorPayload
}

const props = defineProps<{
  subjectId: string
  afterCreate?: (lessons: LessonResponse[]) => void | Promise<void>
}>()

const LESSON_TYPES: LessonType[] = ['NONE', 'LECTURE', 'PRACTICE']
const DAYS: DayOfWeek[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
]

function createEmptyWeek(): DayOfWeek[] {
  return ['MONDAY']
}

function createEmptyScheduleEntry() {
  return {
    type: 'LECTURE' as LessonType,
    startDate: '',
    totalCount: 1,
    daysOfWeek: [createEmptyWeek()],
  }
}

const state = reactive<BulkScheduleRequestPayload>({
  subjectId: props.subjectId,
  schedules: [createEmptyScheduleEntry()],
})

const pending = ref(false)
const { createBulkSchedule } = useLessonsApi()
const toast = useToast()

watch(() => props.subjectId, (value) => {
  state.subjectId = value
}, { immediate: true })

function resetForm() {
  state.subjectId = props.subjectId
  state.schedules = [createEmptyScheduleEntry()]
}

function onAfterLeave() {
  if (!pending.value) {
    resetForm()
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  const apiError = error as ApiErrorShape
  return apiError.data?.statusMessage || apiError.data?.message || apiError.message || 'Failed to bulk schedule lessons'
}

function addScheduleEntry() {
  state.schedules.push(createEmptyScheduleEntry())
}

function removeScheduleEntry(index: number) {
  if (state.schedules.length <= 1) {
    return
  }

  state.schedules.splice(index, 1)
}

function addWeekPattern(scheduleIndex: number) {
  state.schedules[scheduleIndex]?.daysOfWeek.push(createEmptyWeek())
}

function removeWeekPattern(scheduleIndex: number, weekIndex: number) {
  const entry = state.schedules[scheduleIndex]

  if (!entry || entry.daysOfWeek.length <= 1) {
    return
  }

  entry.daysOfWeek.splice(weekIndex, 1)
}

function toggleWeekDay(scheduleIndex: number, weekIndex: number, day: DayOfWeek) {
  const week = state.schedules[scheduleIndex]?.daysOfWeek[weekIndex]

  if (!week) {
    return
  }

  const existingIndex = week.indexOf(day)

  if (existingIndex >= 0) {
    if (week.length > 1) {
      week.splice(existingIndex, 1)
    }

    return
  }

  week.push(day)
}

function isDaySelected(scheduleIndex: number, weekIndex: number, day: DayOfWeek) {
  return state.schedules[scheduleIndex]?.daysOfWeek[weekIndex]?.includes(day) ?? false
}

async function onSubmit(event: { data: BulkScheduleRequestPayload }, close: () => void) {
  if (pending.value) {
    return
  }

  pending.value = true

  try {
    const { data, error } = await createBulkSchedule(event.data)

    if (error.value || !data.value) {
      throw error.value || new Error('Lessons were not returned by API')
    }

    const createdLessons: LessonResponse[] = data.value

    toast.add({
      title: 'Bulk schedule created',
      description: `${createdLessons.length} lessons were created.`,
      color: 'success',
      icon: 'i-lucide-check',
    })

    close()
    resetForm()

    if (props.afterCreate) {
      await props.afterCreate(createdLessons)
    }
  }
  catch (error: unknown) {
    toast.add({
      title: 'Create failed',
      description: getErrorMessage(error),
      color: 'error',
      icon: 'i-lucide-circle-alert',
    })
  }
  finally {
    pending.value = false
  }
}
</script>

<template>
  <UModal
    title="Bulk schedule lessons"
    description="Configure weekly patterns and create recurring lessons."
    :ui="{ content: 'sm:max-w-4xl' }"
    @after:leave="onAfterLeave"
  >
    <UButton icon="i-lucide-calendar-plus" color="neutral" variant="subtle">
      Bulk schedule
    </UButton>

    <template #body="{ close }">
      <UForm
        :schema="bulkScheduleRequestSchema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit($event, close)"
      >
        <div class="space-y-4">
          <div
            v-for="(entry, entryIndex) in state.schedules"
            :key="entryIndex"
            class="rounded-lg border border-default p-4"
          >
            <div class="mb-3 flex items-center justify-between">
              <h4 class="font-medium">
                Schedule {{ entryIndex + 1 }}
              </h4>

              <UButton
                v-if="state.schedules.length > 1"
                icon="i-lucide-trash-2"
                color="neutral"
                variant="ghost"
                size="xs"
                :disabled="pending"
                @click="removeScheduleEntry(entryIndex)"
              >
                Remove
              </UButton>
            </div>

            <div class="grid gap-3 md:grid-cols-3">
              <UFormField :name="`schedules.${entryIndex}.type`" label="Type" required>
                <div class="flex gap-2">
                  <UButton
                    v-for="lessonType in LESSON_TYPES"
                    :key="lessonType"
                    :color="entry.type === lessonType ? 'primary' : 'neutral'"
                    :variant="entry.type === lessonType ? 'solid' : 'soft'"
                    size="xs"
                    :disabled="pending"
                    @click="entry.type = lessonType"
                  >
                    {{ lessonType }}
                  </UButton>
                </div>
              </UFormField>

              <UFormField :name="`schedules.${entryIndex}.startDate`" label="Start date" required>
                <UInput
                  v-model="entry.startDate"
                  placeholder="2025-09-01"
                  :disabled="pending"
                />
              </UFormField>

              <UFormField :name="`schedules.${entryIndex}.totalCount`" label="Total count" required>
                <UInput
                  v-model.number="entry.totalCount"
                  type="number"
                  min="1"
                  :disabled="pending"
                />
              </UFormField>
            </div>

            <div class="mt-3 space-y-3">
              <div
                v-for="(week, weekIndex) in entry.daysOfWeek"
                :key="weekIndex"
                class="rounded-md border border-default p-3"
              >
                <div class="mb-2 flex items-center justify-between">
                  <p class="text-sm font-medium text-muted">
                    Week pattern {{ weekIndex + 1 }}
                  </p>

                  <UButton
                    v-if="entry.daysOfWeek.length > 1"
                    icon="i-lucide-trash"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    :disabled="pending"
                    @click="removeWeekPattern(entryIndex, weekIndex)"
                  >
                    Remove week
                  </UButton>
                </div>

                <div class="flex flex-wrap gap-2">
                  <UButton
                    v-for="day in DAYS"
                    :key="day"
                    :color="isDaySelected(entryIndex, weekIndex, day) ? 'primary' : 'neutral'"
                    :variant="isDaySelected(entryIndex, weekIndex, day) ? 'solid' : 'soft'"
                    size="xs"
                    :disabled="pending"
                    @click="toggleWeekDay(entryIndex, weekIndex, day)"
                  >
                    {{ day.slice(0, 3) }}
                  </UButton>
                </div>
              </div>

              <UButton
                icon="i-lucide-plus"
                color="neutral"
                variant="soft"
                size="sm"
                :disabled="pending"
                @click="addWeekPattern(entryIndex)"
              >
                Add week pattern
              </UButton>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2">
          <UButton
            icon="i-lucide-plus"
            color="neutral"
            variant="soft"
            :disabled="pending"
            @click="addScheduleEntry"
          >
            Add schedule
          </UButton>

          <div class="flex gap-2">
            <UButton
              color="neutral"
              variant="soft"
              :disabled="pending"
              @click="close()"
            >
              Cancel
            </UButton>

            <UButton
              type="submit"
              icon="i-lucide-check"
              :loading="pending"
              :disabled="pending"
            >
              Create
            </UButton>
          </div>
        </div>
      </UForm>
    </template>
  </UModal>
</template>
