<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core'

// Сворачиваемая информационная подсказка. Полезна новым пользователям, но на
// ежедневных экранах превращается в шум — поэтому её можно закрыть, и выбор
// запоминается в localStorage по стабильному `id`.
const props = withDefaults(defineProps<{
  /** Стабильный ключ подсказки — определяет, что именно скрыто. */
  id: string
  title?: string
  description?: string
  icon?: string
  color?: 'neutral' | 'primary' | 'info' | 'success' | 'warning' | 'error'
  variant?: 'solid' | 'outline' | 'soft' | 'subtle'
}>(), {
  title: undefined,
  description: undefined,
  icon: 'i-lucide-info',
  color: 'neutral',
  variant: 'soft',
})

const dismissed = useLocalStorage(`hint-dismissed:${props.id}`, false)

const slots = useSlots()
</script>

<template>
  <UAlert
    v-if="!dismissed"
    :title="title"
    :description="description"
    :icon="icon"
    :color="color"
    :variant="variant"
    :close="{ color: 'neutral', variant: 'link' }"
    @update:open="(open: boolean) => { if (!open) dismissed = true }"
  >
    <template v-if="slots.description" #description>
      <slot name="description" />
    </template>
  </UAlert>
</template>
