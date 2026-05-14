<script setup lang="ts">
import type { Form } from '#ui/types'
import type { FetchError } from 'ofetch'
import * as v from 'valibot'
import { uuidV4 } from '~/utils/validation'

const route = useRoute()
const subjectId = computed(() => String(route.params.uuid ?? ''))

const teachingCreateState = useTeachingCreateState()

const offeringId = computed(() => teachingCreateState.value?.offeringId ?? '')
const groupId = computed(() => teachingCreateState.value?.groupId ?? '')
const existingTeacherIds = computed(() => teachingCreateState.value?.existingTeacherIds ?? [])

const selectedSubgroup = ref<{ id: string }>()

const CreateAssignmentSchema = v.object({
  offeringId: uuidV4('Не удалось определить группу'),
  teacherId: uuidV4('Выберите преподавателя'),
  lessonTypeScope: v.optional(v.picklist(['LECTURE', 'PRACTICE'] as const)),
  subgroupId: v.optional(v.pipe(v.string(), v.uuid())),
})
type Schema = v.InferOutput<typeof CreateAssignmentSchema>

const state = reactive<Schema>({
  offeringId: offeringId.value,
  teacherId: '',
  lessonTypeScope: undefined,
  subgroupId: undefined,
})

watch(selectedSubgroup, (sg) => {
  state.subgroupId = sg?.id
})

const formRef = useTemplateRef<Form<typeof CreateAssignmentSchema>>('form')

const { $backend } = useNuxtApp()
const { toastError } = useApiError()
const toast = useToast()
const submitting = ref(false)

async function handleSubmit() {
  const data = await formRef.value?.validate({ transform: true })
  if (!data)
    return

  submitting.value = true
  try {
    await $backend('/api/subject-assignments', { method: 'POST', body: data })
    toast.add({ title: 'Назначение добавлено', color: 'success', icon: 'i-lucide-check' })
    await navigateTo(`/dashboard/subjects/${subjectId.value}/teaching`)
  }
  catch (e) {
    toastError(e as FetchError)
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-6 w-full">
    <UPageHeader title="Добавить назначение">
      <template #links>
        <UButton
          :to="`/dashboard/subjects/${subjectId}/teaching`"
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="ghost"
          label="Назад"
        />
      </template>
    </UPageHeader>

    <UForm
      ref="form"
      :schema="CreateAssignmentSchema"
      :state="state"
      class="flex flex-col gap-4"
    >
      <UFormField label="Преподаватель" name="teacherId" required>
        <TeacherSelectMenu
          v-model="state.teacherId"
          :exclude="existingTeacherIds"
        />
      </UFormField>

      <UFormField label="Тип занятия" name="lessonTypeScope">
        <LessonTypeScopeSelect v-model="state.lessonTypeScope" />
      </UFormField>

      <UFormField label="Подгруппа" name="subgroupId">
        <SubgroupSelect v-if="groupId" v-model="selectedSubgroup" :group-id="groupId" />
      </UFormField>

      <div class="flex justify-end gap-2">
        <UButton
          :to="`/dashboard/subjects/${subjectId}/teaching`"
          color="neutral"
          variant="ghost"
          label="Отмена"
        />
        <UButton
          icon="i-lucide-check"
          label="Добавить"
          :loading="submitting"
          @click="handleSubmit"
        />
      </div>
    </UForm>
  </div>
</template>
