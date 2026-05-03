<script setup lang="ts">
import type { PresenceType } from '#shared/types/backend'
import type { DropdownMenuItem } from '@nuxt/ui'
import { PRESENCE_TYPES } from '#shared/types/backend'
import { PRESENCE_META } from '~/composables/attendance/useAttendanceTable'

const props = defineProps<{
  lessonId: string
  studentId: string
  presence: PresenceType
  isPending: boolean
}>()

const emit = defineEmits<{
  set: [presence: PresenceType]
}>()

const dropdownItems = computed<DropdownMenuItem[][]>(() => [
  PRESENCE_TYPES.map((type) => {
    const meta = PRESENCE_META[type]
    return {
      label: meta.label,
      icon: meta.icon,
      type: 'checkbox' as const,
      checked: props.presence === type,
      disabled: props.isPending,
      onUpdateChecked: (checked: boolean) => {
        if (checked && props.presence !== type) {
          emit('set', type)
        }
      },
      onSelect: (e: Event) => {
        e.preventDefault()
      },
    }
  }),
])
</script>

<template>
  <UDropdownMenu
    :items="dropdownItems"
  >
    <UButton
      :icon="PRESENCE_META[presence].icon"
      :color="PRESENCE_META[presence].color"
      variant="soft"
      square
      :loading="isPending"
      :disabled="isPending"
    />
  </UDropdownMenu>
</template>
