<script setup lang="ts">
import type { AttendanceStats } from '~/composables/attendance/useAttendanceTable'

defineProps<{
  stats: AttendanceStats | null
}>()
</script>

<template>
  <div v-if="stats">
    <UBadge
      :color="stats.color"
      variant="subtle"
      :label="stats.pct !== null ? `${stats.pct}%` : '—'"
    />
  </div>
  <span v-else>—</span>
</template>
