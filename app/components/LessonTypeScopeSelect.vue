<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'

type LessonTypeScope = components['schemas']['UpdateTeacherSubjectPermissionRequest']['allowedLessonType']

const modelValue = defineModel<LessonTypeScope>()

const items = [
  { value: 'ALL', label: 'Все' },
  { value: 'LECTURE', label: 'Лекция' },
  { value: 'PRACTICE', label: 'Практика' },
]

const selected = computed({
  get() {
    return modelValue.value ?? 'ALL'
  },
  set(val: string) {
    modelValue.value = val === 'ALL' ? undefined : (val as LessonTypeScope)
  },
})
</script>

<template>
  <USelect
    v-model="selected"
    :items="items"
    default-value="ALL"
    class="w-full"
  />
</template>
