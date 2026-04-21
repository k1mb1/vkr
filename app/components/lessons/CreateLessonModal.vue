<script setup lang="ts">
import type { CreateLessonRequestPayload, LessonResponse, LessonType } from '#shared/types/backend'
import { createLessonRequestSchema } from '#shared/types/backend'
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
  afterCreate?: (lesson: LessonResponse) => void | Promise<void>
}>()

const LESSON_TYPES: LessonType[] = ['NONE', 'LECTURE', 'PRACTICE']

const state = reactive<CreateLessonRequestPayload>({
  name: '',
  dateTime: undefined,
  type: 'NONE',
  subjectId: props.subjectId,
})

const pending = ref(false)
const { create } = useLessonsApi()
const toast = useToast()

watch(() => props.subjectId, (value) => {
  state.subjectId = value
}, { immediate: true })

function getDateTimeModelValue(): any {
  if (!state.dateTime) {
    return null
  }

  const value = new Date(state.dateTime)
  return Number.isNaN(value.getTime()) ? null : value
}

function setDateTimeModelValue(value: any) {
  if (!value) {
    state.dateTime = undefined
    return
  }

  if (value instanceof Date) {
    state.dateTime = value.toISOString()
    return
  }

  if (typeof value === 'string') {
    state.dateTime = value.trim() === '' ? undefined : value
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  const apiError = error as ApiErrorShape
  return apiError.data?.statusMessage || apiError.data?.message || apiError.message || 'Failed to create lesson'
}

function resetForm() {
  state.name = ''
  state.type = 'NONE'
  state.dateTime = undefined
  state.subjectId = props.subjectId
}

function onAfterLeave() {
  if (!pending.value) {
    resetForm()
  }
}

async function onSubmit(event: { data: CreateLessonRequestPayload }, close: () => void) {
  if (pending.value) {
    return
  }

  pending.value = true

  try {
    const { data, error } = await create(event.data)

    if (error.value || !data.value) {
      throw error.value || new Error('Lesson was not returned by API')
    }

    const createdLesson: LessonResponse = data.value

    toast.add({
      title: 'Lesson created',
      description: `"${createdLesson.name}" is ready.`,
      color: 'success',
      icon: 'i-lucide-check',
    })

    close()
    resetForm()

    if (props.afterCreate) {
      await props.afterCreate(createdLesson)
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
    title="Create lesson"
    description="Create one lesson with optional date and type."
    @after:leave="onAfterLeave"
  >
    <UButton icon="i-lucide-plus" color="primary" variant="subtle">
      Single lesson
    </UButton>

    <template #body="{ close }">
      <UForm
        :schema="createLessonRequestSchema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit($event, close)"
      >
        <UFormField name="name" label="Lesson name" required>
          <UInput
            v-model="state.name"
            placeholder="e.g. Lesson 1"
            :disabled="pending"
            class="w-full"
          />
        </UFormField>

        <UFormField name="type" label="Type" required>
          <div class="flex gap-2">
            <UButton
              v-for="lessonType in LESSON_TYPES"
              :key="lessonType"
              :color="state.type === lessonType ? 'primary' : 'neutral'"
              :variant="state.type === lessonType ? 'solid' : 'soft'"
              size="sm"
              :disabled="pending"
              @click="state.type = lessonType"
            >
              {{ lessonType }}
            </UButton>
          </div>
        </UFormField>

        <UFormField name="dateTime" label="Date/time">
          <UInputDate
            :model-value="getDateTimeModelValue()"
            :disabled="pending"
            class="w-full"
            @update:model-value="setDateTimeModelValue"
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
