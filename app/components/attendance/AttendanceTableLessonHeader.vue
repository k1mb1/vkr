<script setup lang="ts">
import type { LessonType } from '#shared/types/backend'

defineProps<{
  lessonName: string
  type: LessonType
  dateTime: string | null
}>()
</script>

<template>
  <span class="block w-full truncate">
    {{ lessonName }}
  </span>
</template>
