<script setup lang="ts">
const open = defineModel<boolean>('open', { required: true })

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <UModal v-model:open="open" title="Несохранённые изменения">
    <template #body>
      <p>Вы внесли изменения в группу. Если выйдете сейчас, все изменения будут потеряны.</p>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="emit('cancel')">
          Остаться
        </UButton>
        <UButton color="error" @click="emit('confirm')">
          Выйти без сохранения
        </UButton>
      </div>
    </template>
  </UModal>
</template>
