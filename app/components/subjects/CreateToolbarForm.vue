<script setup lang="ts">
import type { CreateSubjectRequestPayload } from '#shared/types/backend'
import { createSubjectRequestSchema } from '#shared/types/backend'
import { createSubject } from '~/composables/api/useSubjectsApi'
import { useApiError } from '~/composables/useApiError'

const state = reactive<CreateSubjectRequestPayload>({
  name: '',
  description: null,
  teacherId: '',
})

const pending = ref(false)

const { user } = useOidcAuth()
const toast = useToast()
const { toastError } = useApiError()

const teacherId = computed(() => {
  const value = user.value?.sub
  return typeof value === 'string' && value.length > 0 ? value : null
})

watch(teacherId, (value) => {
  state.teacherId = value ?? ''
}, { immediate: true })

const descriptionModel = computed<string>({
  get: () => state.description ?? '',
  set: (val) => { state.description = val || null },
})

function resetForm() {
  state.name = ''
  state.description = null
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
  const { data: createdSubject, error } = await createSubject(payload)
  pending.value = false

  if (error.value) {
    toastError(error.value, 'Create failed')
    return
  }

  toast.add({
    title: 'Subject created',
    description: `"${createdSubject.value!.name}" is ready.`,
    color: 'success',
    icon: 'i-lucide-check',
  })

  close()
  resetForm()
  await navigateTo(`/dashboard/subjects/${createdSubject.value!.id}`)
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
            v-model="descriptionModel"
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
