<script setup lang="ts">
import type { LessonSummary } from '~/composables/attendance/useAttendanceTable'

const props = defineProps<{
  summary: LessonSummary
  total: number
}>()

const items = computed(() => {
  const badges: { color: string, icon: string, label: number }[] = []
  if (props.summary.present > 0)
    badges.push({ color: 'success', icon: 'i-lucide-check', label: props.summary.present })
  if (props.summary.late > 0)
    badges.push({ color: 'warning', icon: 'i-lucide-clock', label: props.summary.late })
  if (props.summary.notPresent > 0)
    badges.push({ color: 'error', icon: 'i-lucide-x', label: props.summary.notPresent })
  if (props.summary.none > 0)
    badges.push({ color: 'neutral', icon: 'i-lucide-minus', label: props.summary.none })
  return badges
})
</script>

<template>
  <div class="flex flex-col items-center gap-1">
    <div class="flex items-center gap-1.5">
      <UBadge
        v-for="(badge, i) in items"
        :key="i"
        :color="badge.color as any"
        variant="subtle"
        :icon="badge.icon"
        :label="String(badge.label)"
      />
    </div>
    <span class="text-[10px] text-muted">{{ total }} чел.</span>
  </div>
</template>
