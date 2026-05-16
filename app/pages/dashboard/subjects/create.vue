<script setup lang="ts">
import type { User } from '#auth-utils'
import type { components } from '#open-fetch-schemas/backend'
import type { Form } from '#ui/types'
import type { FetchError } from 'ofetch'
import * as v from 'valibot'

import { useApiError } from '~/composables/useApiError'
import { string, uuidV4 } from '~/utils/validation'

type CreateSubjectRequest = components['schemas']['CreateSubjectRequest']

const CreateSubjectRequestSchema: SchemaFor<CreateSubjectRequest> = v.object({
  name: string('Введите название предмета'),
  description: v.optional(v.string()),
  groupId: uuidV4('Выберите группу'),
  teacherId: uuidV4('Выберите преподавателя'),
})
type Schema = v.InferOutput<typeof CreateSubjectRequestSchema>

const { user } = useOidcAuth()
const { sub: myTeacherId } = user.value as User

const { $backend } = useNuxtApp()
const { toastError } = useApiError()
const toast = useToast()

const state = reactive<Schema>({
  name: '',
  description: undefined,
  groupId: '',
  teacherId: myTeacherId!,
})

const loading = ref(false)
const formRef = useTemplateRef<Form<typeof CreateSubjectRequestSchema>>('form')

async function handleCreate() {
  const data = await formRef.value?.validate({ transform: true })
  if (!data)
    return

  loading.value = true
  try {
    const result = await $backend('/api/subjects', { method: 'POST', body: data })
    toast.add({
      title: 'Предмет создан',
      color: 'success',
      icon: 'i-lucide-check',
    })
    await navigateTo(`/dashboard/subjects/${result.id}`)
  }
  catch (e) {
    toastError(e as FetchError)
  }
  finally {
    loading.value = false
  }
}

function resetForm() {
  state.name = ''
  state.description = undefined
  state.groupId = ''
}
</script>

<template>
  <div class="flex flex-col gap-4 w-full mx-auto">
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

    <UForm
      ref="form"
      :schema="CreateSubjectRequestSchema"
      :state="state"
      class="flex flex-col gap-4"
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
          minlength="3"
          placeholder="Краткое описание предмета (необязательно)"
          class="w-full"
        />
      </UFormField>

      <UFormField label="Группа" name="groupId" required>
        <GroupSelectMenu v-model="state.groupId" />
      </UFormField>

      <div class="flex justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          type="button"
          @click="resetForm"
        >
          Очистить
        </UButton>
        <UButton
          type="button"
          icon="i-lucide-check"
          :loading="loading"
          @click="handleCreate"
        >
          Создать предмет
        </UButton>
      </div>
    </UForm>
  </div>
</template>
