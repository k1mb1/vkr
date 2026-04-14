<script setup lang="ts">
import type { CreateSubjectRequest, SubjectResponse } from '#shared/types/backend'
import { z } from 'zod'
import { useSubjectsApi } from '~/composables/api/useSubjectsApi'

const createSubjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(120, 'Name must be 120 characters or less'),
  description: z
    .string()
    .trim()
    .max(500, 'Description must be 500 characters or less')
    .optional()
    .or(z.literal('')),
})

type CreateSubjectFormData = z.output<typeof createSubjectSchema>
interface ApiErrorPayload {
  statusMessage?: string
  message?: string
}

interface ApiErrorShape {
  message?: string
  data?: ApiErrorPayload
}

const state = reactive<CreateSubjectFormData>({
  name: '',
  description: '',
})

const pending = ref(false)

const { create } = useSubjectsApi()
const { user } = useOidcAuth()
const toast = useToast()

const teacherId = computed(() => {
  const value = user.value?.sub
  return typeof value === 'string' && value.length > 0 ? value : null
})

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  const apiError = error as ApiErrorShape
  return apiError.data?.statusMessage || apiError.data?.message || apiError.message || 'Failed to create subject'
}

function resetForm() {
  state.name = ''
  state.description = ''
}

function onAfterLeave() {
  if (!pending.value) {
    resetForm()
  }
}

async function onSubmit(event: { data: CreateSubjectFormData }, close: () => void) {
  if (pending.value) {
    return
  }

  if (!teacherId.value) {
    toast.add({
      title: 'Cannot create subject',
      description: 'Teacher id was not found in the current OIDC session.',
      color: 'error',
      icon: 'i-lucide-circle-alert',
    })
    return
  }

  const normalizedDescription = event.data.description?.trim()
  const payload: CreateSubjectRequest = {
    name: event.data.name.trim(),
    teacherId: teacherId.value,
    ...(normalizedDescription ? { description: normalizedDescription } : {}),
  }

  pending.value = true

  try {
    const response = await create(payload)

    if (response.error.value || !response.data.value) {
      throw response.error.value || new Error('Subject was not returned by API')
    }

    const createdSubject: SubjectResponse = response.data.value

    toast.add({
      title: 'Subject created',
      description: `"${createdSubject.name}" is ready.`,
      color: 'success',
      icon: 'i-lucide-check',
    })

    close()
    resetForm()
    await navigateTo(`/dashboard/subjects/${createdSubject.id}`)
  }
  catch (error: unknown) {
    toast.add({
      title: 'Create failed',
      description: getErrorMessage(error),
      color: 'error',
      icon: 'i-lucide-circle-alert',
    })
  }
  finally {
    pending.value = false
  }
}
</script>

<template>
  <UModal
    title="Create subject"
    description="Fill subject details and submit."
    @after:leave="onAfterLeave"
  >
    <UButton
      icon="i-lucide-plus"
      color="primary"
    >
      Create subject
    </UButton>

    <template #body="{ close }">
      <UForm
        :schema="createSubjectSchema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit($event, close)"
      >
        <UFormField
          name="name"
          label="Subject"
          required
        >
          <UInput
            v-model="state.name"
            placeholder="e.g. Algebra"
            :disabled="pending"
            class="w-full"
          />
        </UFormField>

        <UFormField
          name="description"
          label="Description"
        >
          <UTextarea
            v-model="state.description"
            placeholder="Optional short description"
            :rows="3"
            :disabled="pending"
            class="w-full"
          />
        </UFormField>

        <div class="flex justify-end gap-2">
          <UButton
            color="neutral"
            variant="soft"
            :disabled="pending"
            @click="close()"
          >
            Cancel
          </UButton>

          <UButton
            type="submit"
            icon="i-lucide-check"
            :loading="pending"
            :disabled="pending"
          >
            Create
          </UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>
