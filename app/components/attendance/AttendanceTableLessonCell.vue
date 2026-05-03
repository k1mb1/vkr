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
      onSelect: (e: Event) => {
        e.preventDefault()
        if (props.presence !== type) {
          emit('set', type)
        }
      },
    }
  }),
])
</script>

<template>
  <div class="flex h-full w-full items-center justify-center">
    <UDropdownMenu
      :items="dropdownItems"
      :content="{ align: 'center', side: 'bottom', sideOffset: 4 }"
    >
      <UButton
        :icon="PRESENCE_META[presence].icon"
        :color="PRESENCE_META[presence].color"
        :variant="presence === 'NONE' ? 'ghost' : 'soft'"
        square
        :loading="isPending"
        :disabled="isPending"
      />
    </UDropdownMenu>
  </div>
</template>
