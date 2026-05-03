<script setup lang="ts">
import type { LessonType } from '#shared/types/backend'
import { LESSON_TYPE_ICONS } from '~/composables/attendance/useAttendanceTable'

defineProps<{
  lessonName: string
  type: LessonType
  dateTime: string | null
}>()

function lessonDateLabel(dateTime: string | null): string {
  if (!dateTime)
    return '—'
  return new Date(dateTime).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}
</script>

<template>
  <div class="flex flex-col items-center gap-0.5">
    <div class="flex items-center gap-1">
      <UIcon :name="LESSON_TYPE_ICONS[type] ?? 'i-lucide-minus'" class="size-3 text-muted shrink-0" />
      <span class="text-xs font-medium truncate max-w-16">{{ lessonName }}</span>
    </div>
    <span class="text-[10px] text-muted">{{ lessonDateLabel(dateTime) }}</span>
  </div>
</template>
