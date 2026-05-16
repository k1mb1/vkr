<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'
import type { Form } from '#ui/types'
import type { FetchError } from 'ofetch'
import * as v from 'valibot'
import { nonNegativeInteger, uuidV4 } from '~/utils/validation'

type CreateLessonsByTypeRequest = components['schemas']['CreateLessonsByTypeRequest']

const CreateLessonsSchema = v.pipe(
  v.object({
    subjectId: uuidV4(),
    groupId: uuidV4('Выберите группу'),
    subgroupId: v.optional(v.nullable(v.pipe(v.string(), v.uuid()))),
    lectureCount: nonNegativeInteger(),
    practiceCount: nonNegativeInteger(),
  }),
  v.check(
    d => d.lectureCount > 0 || d.practiceCount > 0,
    'Укажите хотя бы одно занятие',
  ),
)
type Schema = v.InferOutput<typeof CreateLessonsSchema>

const route = useRoute()
const subjectId = String(route.params.uuid ?? '')

const { $backend } = useNuxtApp()
const { toastError } = useApiError()
const toast = useToast()

const state = reactive<Omit<Schema, never>>({
  subjectId,
  groupId: '',
  subgroupId: null,
  lectureCount: 0,
  practiceCount: 0,
})

const loading = ref(false)
const formRef = useTemplateRef<Form<typeof CreateLessonsSchema>>('form')

async function handleCreate() {
  const data = await formRef.value?.validate({ transform: true })
  if (!data)
    return

  loading.value = true
  try {
    const body: CreateLessonsByTypeRequest = {
      subjectId: data.subjectId,
      groupId: data.groupId,
      subgroupId: data.subgroupId ?? undefined,
      lectureCount: data.lectureCount,
      practiceCount: data.practiceCount,
    }
    const result = await $backend('/api/lessons/by-type', { method: 'POST', body })
    toast.add({
      title: `Создано занятий: ${result.length}`,
      color: 'success',
      icon: 'i-lucide-check',
    })
    await navigateTo(`/dashboard/subjects/${subjectId}/lessons`)
  }
  catch (e) {
    toastError(e as FetchError)
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <UPageHeader title="Создать занятия по количеству">
      <template #links>
        <UButton
          :to="`/dashboard/subjects/${subjectId}/lessons`"
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="ghost"
          label="Назад"
        />
      </template>
    </UPageHeader>

    <UForm
      ref="form"
      :schema="CreateLessonsSchema"
      :state="state"
      class="flex flex-col gap-4"
    >
      <UFormField label="Группа" name="groupId" required>
        <GroupSelectMenu v-model="state.groupId" />
      </UFormField>

      <UFormField label="Подгруппа" name="subgroupId">
        <SubgroupSelect v-model="state.subgroupId" :group-id="state.groupId" />
      </UFormField>

      <div class="grid grid-cols-2 gap-4">
        <UFormField label="Количество лекций" name="lectureCount" required>
          <UInput
            v-model.number="state.lectureCount"
            type="number"
            :min="0"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Количество практик" name="practiceCount" required>
          <UInput
            v-model.number="state.practiceCount"
            type="number"
            :min="0"
            class="w-full"
          />
        </UFormField>
      </div>

      <div class="flex justify-end gap-2">
        <UButton
          :to="`/dashboard/subjects/${subjectId}/lessons`"
          color="neutral"
          variant="ghost"
        >
          Отмена
        </UButton>
        <UButton
          icon="i-lucide-check"
          :loading="loading"
          @click="handleCreate"
        >
          Создать занятия
        </UButton>
      </div>
    </UForm>
  </div>
</template>
