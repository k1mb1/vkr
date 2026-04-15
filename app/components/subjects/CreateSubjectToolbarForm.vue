<script setup lang="ts">
import type { CreateSubjectRequestPayload, SubjectResponse } from '#shared/types/backend'
import { createSubjectRequestSchema } from '#shared/types/backend'
import { useSubjectsApi } from '~/composables/api/useSubjectsApi'

interface ApiErrorPayload {
  statusMessage?: string
  message?: string
}

interface ApiErrorShape {
  message?: string
  data?: ApiErrorPayload
}

const state = reactive<CreateSubjectRequestPayload>({
  name: '',
  description: '',
  teacherId: '',
})

const pending = ref(false)

const { create } = useSubjectsApi()
const { user } = useOidcAuth()
const toast = useToast()

const teacherId = computed(() => {
  const value = user.value?.sub
  return typeof value === 'string' && value.length > 0 ? value : null
})

watch(teacherId, (value) => {
  state.teacherId = value ?? ''
}, { immediate: true })

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
  state.teacherId = ''
}

function onAfterLeave() {
  if (!pending.value) {
    resetForm()
  }
}

async function onSubmit(event: { data: CreateSubjectRequestPayload }, close: () => void) {
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

  const payload: CreateSubjectRequestPayload = {
    ...event.data,
    teacherId: teacherId.value,
  }

  pending.value = true

  try {
    const {
      data,
      error,
    } = await create(payload)

    if (error.value || !data.value) {
      throw error.value || new Error('Subject was not returned by API')
    }

    const createdSubject: SubjectResponse = data.value

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
        :schema="createSubjectRequestSchema"
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
