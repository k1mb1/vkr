<script setup lang="ts">
interface Props {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  confirmColor?: 'primary' | 'error' | 'success' | 'neutral' | 'warning'
  confirmIcon?: string
  cancelLabel?: string
  pending?: boolean
}

withDefaults(defineProps<Props>(), {
  description: undefined,
  confirmLabel: 'Подтвердить',
  confirmColor: 'primary',
  confirmIcon: undefined,
  cancelLabel: 'Отмена',
  pending: false,
})

const emit = defineEmits<{
  close: []
  confirm: []
}>()
</script>

<template>
  <UModal
    :open="open"
    :title="title"
    @update:open="(v: boolean) => { if (!v && !pending) emit('close') }"
  >
    <template #body="{ close }">
      <div class="flex flex-col gap-4">
        <p v-if="description">
          {{ description }}
        </p>

        <div class="flex justify-end gap-2">
          <UButton
            color="neutral"
            variant="soft"
            :disabled="pending"
            @click="close()"
          >
            {{ cancelLabel }}
          </UButton>

          <UButton
            :color="confirmColor"
            :icon="confirmIcon"
            :loading="pending"
            :disabled="pending"
            @click="emit('confirm')"
          >
            {{ confirmLabel }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
