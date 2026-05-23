<script setup lang="ts">
import type { User } from '#auth-utils'
import type { components } from '#open-fetch-schemas/backend'

type CreateSubjectRequest = components['schemas']['CreateSubjectRequest']

const { user } = useOidcAuth()
const { sub: myTeacherId } = user.value as User

const { $backend } = useNuxtApp()

const name = ref('')
const description = ref<string | undefined>(undefined)
const teacherId = ref<string>(myTeacherId!)
const groupIds = ref<string[]>([])

const errors = ref<string[]>([])

function validate(): boolean {
  errors.value = []
  if (!name.value.trim())
    errors.value.push('Введите название предмета')
  const filled = groupIds.value.filter(Boolean)
  if (filled.length === 0)
    errors.value.push('Выберите хотя бы одну группу')
  const unique = new Set(filled)
  if (unique.size !== filled.length)
    errors.value.push('Группы не должны повторяться')
  return errors.value.length === 0
}

const { loading, submit } = useFormSubmit()

async function handleCreate() {
  if (!validate())
    return

  await submit(
    () => {
      const body: CreateSubjectRequest = {
        name: name.value.trim(),
        description: description.value || undefined,
        teacherId: teacherId.value,
        groupIds: groupIds.value.filter(Boolean),
      }
      return $backend('/api/subjects', { method: 'POST', body })
    },
    {
      successMessage: 'Предмет создан',
      onSuccess: result => navigateTo(`/dashboard/subjects/${result.id}`),
    },
  )
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <UPageHeader title="Создать предмет">
      <template #links>
        <UButton
          to="/dashboard/subjects"
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="ghost"
          label="Назад"
        />
      </template>
    </UPageHeader>

    <UAlert
      v-if="errors.length"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Исправьте ошибки"
      :description="errors.join(' · ')"
    />

    <div class="flex flex-col gap-4">
      <UFormField label="Название предмета" required>
        <UInput
          v-model="name"
          placeholder="Например: Математический анализ"
          class="w-full"
        />
      </UFormField>

      <UFormField label="Описание">
        <UTextarea
          v-model="description"
          autoresize
          minlength="3"
          placeholder="Краткое описание предмета (необязательно)"
          class="w-full"
        />
      </UFormField>

      <UFormField label="Группы" required>
        <GroupsMultiSelectRequest v-model="groupIds" />
      </UFormField>

      <UButton
        type="button"
        icon="i-lucide-check"
        :loading="loading"
        class="ml-auto"
        @click="handleCreate"
      >
        Создать предмет
      </UButton>
    </div>
  </div>
</template>
