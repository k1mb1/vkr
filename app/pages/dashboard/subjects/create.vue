<script setup lang="ts">
import type { User } from '#auth-utils'
import type { components } from '#open-fetch-schemas/backend'
import type { SchemaFor } from '~/utils/validation'

import * as v from 'valibot'
import { arrayMinLength, string } from '~/utils/validation'

type CreateSubjectRequest = components['schemas']['CreateSubjectRequest']
type CreateSubjectForm = Omit<CreateSubjectRequest, 'teacherId'>

const CreateSubjectRequestSchema: SchemaFor<CreateSubjectForm> = v.object({
  name: string('Введите название предмета'),
  description: v.optional(v.pipe(v.string(), v.trim())),
  groupIds: v.pipe(
    arrayMinLength(v.string(), 1, 'Выберите хотя бы одну группу'),
    v.check(ids => new Set(ids).size === ids.length, 'Группы не должны повторяться'),
  ),
})

const { user } = useOidcAuth()
const { sub: myTeacherId } = user.value as User

const { $backend } = useNuxtApp()

const { state, formRef, loading, onSubmit, onError } = useResourceForm<typeof CreateSubjectRequestSchema>({
  initialState: () => ({ name: '', description: undefined, groupIds: [] }),
  successMessage: 'Предмет создан',
})

const handleCreate = onSubmit(
  (data) => {
    const body: CreateSubjectRequest = {
      name: data.name,
      description: data.description || undefined,
      teacherId: myTeacherId!,
      groupIds: data.groupIds,
    }
    return $backend('/api/subjects', { method: 'POST', body })
  },
  {
    onSuccess: result => navigateTo(`/dashboard/subjects/${result.id}`),
  },
)
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
      color="neutral"
      variant="soft"
      icon="i-lucide-info"
      title="Что такое предмет"
      description="Предмет объединяет группы, занятия, оценки и преподавателей. Укажите название, при желании описание, и выберите группы, которые будут его изучать. Доступы преподавателей и политики оценивания настраиваются позже — в разделе «Настройки» предмета."
    />

    <UForm
      ref="formRef"
      :schema="CreateSubjectRequestSchema"
      :state="state"
      class="flex flex-col gap-4"
      @submit="handleCreate"
      @error="onError"
    >
      <UFormField label="Название предмета" name="name" required>
        <UInput
          v-model="state.name"
          placeholder="Например: Математический анализ"
          class="w-full"
        />
      </UFormField>

      <UFormField label="Описание" name="description">
        <UTextarea
          v-model="state.description"
          autoresize
          placeholder="Краткое описание предмета (необязательно)"
          class="w-full"
        />
      </UFormField>

      <UFormField label="Группы" name="groupIds" required>
        <GroupsMultiSelectRequest v-model="state.groupIds" />
      </UFormField>

      <UButton
        type="submit"
        icon="i-lucide-check"
        :loading="loading"
        class="ml-auto"
      >
        Создать предмет
      </UButton>
    </UForm>
  </div>
</template>
