<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'

type LessonType = NonNullable<components['schemas']['UpdateTeacherSubjectPermissionRequest']['allowedLessonType']>
const modelValue = defineModel<LessonType | null | undefined>()
const items = [
  { value: null as LessonType | null, label: 'Все типы' },
  { value: 'LECTURE' as LessonType, label: 'Лекция' },
  { value: 'PRACTICE' as LessonType, label: 'Практика' },
]
</script>

<template>
  <USelect
    v-model="modelValue"
    :items="items"
    class="w-full"
  />
</template>
