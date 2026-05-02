<script setup lang="ts">
import type { CreateLessonRequestPayload, LessonResponse, LessonType } from '#shared/types/backend'
import type { AnyCalendarDate } from '@internationalized/date'
import { createLessonRequestSchema, LESSON_TYPES } from '#shared/types/backend'
import { createLesson } from '~/composables/api/useLessonsApi'
import { useApiError } from '~/composables/useApiError'

const props = defineProps<{
  subjectId: string
  afterCreate?: (lesson: LessonResponse) => void | Promise<void>
}>()

const state = reactive({
  name: '',
  dateTime: undefined as AnyCalendarDate | undefined | null,
  type: 'NONE' as LessonType,
  subjectId: props.subjectId,
})

const pending = ref(false)
const { toastError, toast } = useApiError()

watch(() => props.subjectId, (value) => {
  state.subjectId = value
}, { immediate: true })

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
  const { data: createdLesson, error } = await createLesson(event.data)
  pending.value = false

  if (error.value) {
    toastError(error.value, 'Create failed')
    return
  }

  toast.add({
    title: 'Lesson created',
    description: `"${createdLesson.value!.name}" is ready.`,
    color: 'success',
    icon: 'i-lucide-check',
  })

  close()
  resetForm()

  if (props.afterCreate) {
    await props.afterCreate(createdLesson.value!)
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
            :disabled="pending"
            class="w-full"
          />
          <!-- <UInputDate
            v-model="state.dateTime"
            :disabled="pending"
            class="w-full"
          /> -->
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
