<script setup lang="ts">
import type { BadgeProps } from '@nuxt/ui'
import type { LessonSummary } from '~/composables/attendance/useAttendanceTable'

const props = defineProps<{
  summary: LessonSummary
  total: number
}>()

const items: { color: BadgeProps['color'], icon: string, key: keyof LessonSummary }[] = [
  { color: 'success', icon: 'i-lucide-check', key: 'present' },
  { color: 'warning', icon: 'i-lucide-clock', key: 'late' },
  { color: 'error', icon: 'i-lucide-x', key: 'notPresent' },
  { color: 'neutral', icon: 'i-lucide-minus', key: 'none' },
]
</script>

<template>
  <div class="flex flex-col gap-1">
    <UBadge
      v-for="(badge, i) in items"
      :key="i"
      :color="badge.color"
      variant="subtle"
      :icon="badge.icon"
      :label="String(summary[badge.key])"
      class="w-full justify-center"
    />
    <span class="text-muted">{{ total }} чел.</span>
  </div>
</template>
