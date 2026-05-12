<script setup lang="ts">
interface Props {
  open: boolean
  pending: boolean
}

defineProps<Props>()
const emit = defineEmits<{
  close: []
  confirm: []
}>()
</script>

<template>
  <ConfirmModal
    :open="open"
    title="Удалить группу"
    description="Группа будет удалена безвозвратно и все её данные будут потеряны. Убедитесь, что это действие действительно необходимо."
    confirm-label="Удалить"
    confirm-color="error"
    confirm-icon="i-lucide-trash-2"
    :pending="pending"
    @close="emit('close')"
    @confirm="emit('confirm')"
  />
</template>
