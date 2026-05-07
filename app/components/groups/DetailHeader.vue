<script setup lang="ts">
interface Props {
  name: string
  studentsCount: number
  subgroupsCount: number
  isEditing: boolean
  editLoading: boolean
  modelValue: string
}

defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: string]
  'edit': []
  'cancel': []
  'save': []
  'delete': []
}>()
</script>

<template>
  <div class="flex items-center gap-4">
    <UAvatar
      icon="i-lucide-users"
      size="xl"
      class="rounded-xl bg-secondary/10 text-secondary"
    />
    <div class="flex-1">
      <template v-if="!isEditing">
        <h1 class="text-xl font-semibold">
          {{ name }}
        </h1>
        <div class="flex items-center gap-2 text-sm text-muted">
          <span>{{ studentsCount }} студентов</span>
          <span>·</span>
          <span>{{ subgroupsCount }} подгрупп</span>
        </div>
      </template>
      <template v-else>
        <UInput
          :model-value="modelValue"
          placeholder="Название группы"
          class="w-full"
          @update:model-value="v => emit('update:modelValue', v)"
        />
      </template>
    </div>
    <template v-if="!isEditing">
      <UButton
        label="Редактировать"
        icon="i-lucide-pencil"
        variant="outline"
        @click="emit('edit')"
      />
      <UButton
        icon="i-lucide-trash-2"
        color="error"
        variant="ghost"
        @click="emit('delete')"
      />
    </template>
    <template v-else>
      <UButton
        color="neutral"
        variant="ghost"
        @click="emit('cancel')"
      >
        Отмена
      </UButton>
      <UButton
        icon="i-lucide-check"
        :loading="editLoading"
        @click="emit('save')"
      >
        Сохранить
      </UButton>
    </template>
  </div>
</template>
