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
  <UModal
    :open="open"
    title="Удалить группу"
    @update:open="(v: boolean) => { if (!v && !pending) emit('close') }"
  >
    <template #body="{ close }">
      <div class="flex flex-col gap-4">
        <p>
          Группа будет удалена безвозвратно и все её данные будут потеряны. Убедитесь, что это действие действительно необходимо.
        </p>

        <div class="flex justify-end gap-2">
          <UButton
            color="neutral"
            variant="soft"
            :disabled="pending"
            @click="close()"
          >
            Отмена
          </UButton>

          <UButton
            color="error"
            icon="i-lucide-trash-2"
            :loading="pending"
            :disabled="pending"
            @click="emit('confirm')"
          >
            Удалить
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
