<script setup lang="ts">
import type {
  CreateLessonsByTypeRequestPayload,
  LessonResponse,
} from '#shared/types/backend'
import { createLessonsByTypeRequestSchema } from '#shared/types/backend'
import { useLessonsApi } from '~/composables/api/useLessonsApi'

interface ApiErrorPayload {
  statusMessage?: string
  message?: string
}

interface ApiErrorShape {
  message?: string
  data?: ApiErrorPayload
}

const props = defineProps<{
  subjectId: string
  afterCreate?: (lessons: LessonResponse[]) => void | Promise<void>
}>()

const state = reactive<CreateLessonsByTypeRequestPayload>({
  subjectId: props.subjectId,
  lectureCount: 0,
  practiceCount: 0,
})

const pending = ref(false)
const { createBulkByType } = useLessonsApi()
const toast = useToast()

watch(() => props.subjectId, (value) => {
  state.subjectId = value
}, { immediate: true })

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  const apiError = error as ApiErrorShape
  return apiError.data?.statusMessage || apiError.data?.message || apiError.message || 'Failed to create lessons'
}

function resetForm() {
  state.subjectId = props.subjectId
  state.lectureCount = 0
  state.practiceCount = 0
}

function onAfterLeave() {
  if (!pending.value) {
    resetForm()
  }
}

async function onSubmit(event: { data: CreateLessonsByTypeRequestPayload }, close: () => void) {
  if (pending.value) {
    return
  }

  pending.value = true

  try {
    const { data, error } = await createBulkByType(event.data)

    if (error.value || !data.value) {
      throw error.value || new Error('Lessons were not returned by API')
    }

    const createdLessons: LessonResponse[] = data.value

    toast.add({
      title: 'Lessons created',
      description: `${createdLessons.length} lessons were created.`,
      color: 'success',
      icon: 'i-lucide-check',
    })

    close()
    resetForm()

    if (props.afterCreate) {
      await props.afterCreate(createdLessons)
    }
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
    title="Create lessons by type"
    description="Set lecture/practice counts without schedule dates."
    @after:leave="onAfterLeave"
  >
    <UButton icon="i-lucide-layers-3" color="neutral" variant="subtle">
      Bulk by type
    </UButton>

    <template #body="{ close }">
      <UForm
        :schema="createLessonsByTypeRequestSchema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit($event, close)"
      >
        <UFormField name="lectureCount" label="Lecture count" required>
          <UInput
            v-model.number="state.lectureCount"
            type="number"
            min="0"
            :disabled="pending"
            class="w-full"
          />
        </UFormField>

        <UFormField name="practiceCount" label="Practice count" required>
          <UInput
            v-model.number="state.practiceCount"
            type="number"
            min="0"
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
