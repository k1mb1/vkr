<script setup lang="ts">
type LessonType = 'LECTURE' | 'PRACTICE'

const props = defineProps<{
  groupId?: string
}>()

const modelValue = defineModel<LessonType | null | undefined>()

const { scopes } = usePermissions()

const restrictedType = computed<LessonType | null | undefined>(() => {
  if (!props.groupId)
    return undefined
  const scope = scopes.value.find(s => s.group?.id === props.groupId)
  return scope?.allowedLessonType as LessonType | null | undefined
})

const allItems = [
  { value: null as LessonType | null, label: 'Все типы' },
  { value: 'LECTURE' as LessonType, label: 'Лекция' },
  { value: 'PRACTICE' as LessonType, label: 'Практика' },
]

const items = computed(() => {
  if (restrictedType.value) {
    return allItems.filter(i => i.value === restrictedType.value)
  }
  return allItems
})

// Auto-select restricted value when it changes
watch(restrictedType, (type) => {
  if (type) {
    modelValue.value = type
  }
}, { immediate: true })
</script>

<template>
  <USelect
    v-model="modelValue"
    :items="items"
    :disabled="!!restrictedType"
    class="w-full"
  />
</template>
