<script setup lang="ts">
import type { PresenceType } from '#shared/types/backend'
import type { AttendanceRow } from '~/composables/attendance/useAttendanceTable'

const props = defineProps<{
  row: AttendanceRow
  lessonIds: string[]
}>()

const stat = computed(() => {
  let present = 0
  let late = 0
  for (const id of props.lessonIds) {
    const p = (props.row[id] as PresenceType) ?? 'NONE'
    if (p === 'PRESENT')
      present++
    else if (p === 'LATE')
      late++
  }
  const total = props.lessonIds.length
  const attended = present + late
  const pct = total > 0 ? Math.round((attended / total) * 100) : null
  const color: 'neutral' | 'success' | 'warning' | 'error' = pct === null ? 'neutral' : pct >= 80 ? 'success' : pct >= 60 ? 'warning' : 'error'
  return { present, late, total, attended, pct, color }
})
</script>

<template>
  <div class="flex flex-col w-min">
    <UBadge
      :color="stat.color"
      variant="subtle"
      :label="stat.pct !== null ? `${stat.pct}%` : '—'"
    />
    <span>{{ stat.attended }}/{{ stat.total }}</span>
  </div>
</template>
