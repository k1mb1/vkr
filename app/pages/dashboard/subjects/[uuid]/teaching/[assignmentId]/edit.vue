<script setup lang="ts">
import type { Form } from '#ui/types'
import type { FetchError } from 'ofetch'
import * as v from 'valibot'
import { uuidV4 } from '~/utils/validation'

const route = useRoute()
const subjectId = computed(() => String(route.params.uuid ?? ''))
const assignmentId = computed(() => String(route.params.assignmentId ?? ''))

const teachingEditState = useTeachingEditState()

const groupId = computed(() => teachingEditState.value?.groupId ?? '')
const row = computed(() => teachingEditState.value)

const selectedSubgroup = ref<{ id: string, index?: number }>()

// ── Form ──────────────────────────────────────────────────

const UpdateAssignmentSchema = v.object({
  teacherId: uuidV4('Преподаватель не найден'),
  lessonTypeScope: v.optional(v.picklist(['LECTURE', 'PRACTICE'] as const)),
  subgroupId: v.optional(v.pipe(v.string(), v.uuid())),
})
type Schema = v.InferOutput<typeof UpdateAssignmentSchema>

const state = reactive<Schema>({
  teacherId: '',
  lessonTypeScope: undefined,
  subgroupId: undefined,
})

watch(row, (r) => {
  if (!r)
    return
  state.teacherId = r.teacherId ?? ''
  state.lessonTypeScope = r.lessonTypeScope ?? undefined
  state.subgroupId = r.subgroupId ?? undefined
  if (r.subgroupId != null && r.subgroupIndex != null) {
    selectedSubgroup.value = { id: r.subgroupId, index: r.subgroupIndex }
  }
}, { immediate: true })

watch(selectedSubgroup, (sg) => {
  state.subgroupId = sg?.id
})

const formRef = useTemplateRef<Form<typeof UpdateAssignmentSchema>>('form')

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
    await $backend('/api/subject-assignments/{id}', {
      method: 'PATCH',
      path: { id: assignmentId.value },
      body: data,
    })
    toast.add({ title: 'Назначение обновлено', color: 'success', icon: 'i-lucide-check' })
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
    <UPageHeader
      title="Изменить назначение"
      :description="row ? `Преподаватель: ${row.teacherName}` : undefined"
    >
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
      :schema="UpdateAssignmentSchema"
      :state="state"
      class="flex flex-col gap-4"
    >
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
          label="Сохранить"
          :loading="submitting"
          @click="handleSubmit"
        />
      </div>
    </UForm>
  </div>
</template>
