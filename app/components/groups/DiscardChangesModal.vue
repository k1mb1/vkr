<script setup lang="ts">
const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const open = defineModel<boolean>('open', { required: true })
</script>

<template>
  <ConfirmModal
    v-model:open="open"
    title="Несохранённые изменения"
    description="Вы внесли изменения в группу. Если выйдете сейчас, все изменения будут потеряны."
    confirm-label="Выйти без сохранения"
    confirm-color="error"
    cancel-label="Остаться"
    @close="emit('cancel')"
    @confirm="emit('confirm')"
  />
</template>
