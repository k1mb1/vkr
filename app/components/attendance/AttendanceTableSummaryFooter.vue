<script setup lang="ts">
import type { AttendanceStats } from '~/composables/attendance/useAttendanceTable'

defineProps<{
  stats: AttendanceStats | null
}>()
</script>

<template>
  <div v-if="stats" class="flex flex-col items-center gap-0.5">
    <UBadge
      :color="stats.color"
      variant="subtle"
      :label="stats.pct !== null ? `${stats.pct}%` : '—'"
    />
    <span class="text-[10px] text-muted">{{ stats.attended }}/{{ stats.total }}</span>
  </div>
  <span v-else class="text-xs text-muted">—</span>
</template>
