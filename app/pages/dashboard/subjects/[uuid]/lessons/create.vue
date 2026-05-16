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

// ── My scope ─────────────────────────────────────────────

const { permission, pending: loadingScope } = usePermissions()

const state = reactive<Schema>({
  subjectId,
  groupId: '',
  subgroupId: null,
  lectureCount: 0,
  practiceCount: 0,
})

// Seed from the single permission: groupId is fixed, subgroupId is fixed if restricted.
watch(permission, (p) => {
  if (!p)
    return
  state.groupId = p.groupId ?? ''
  state.subgroupId = p.allowedSubgroupId ?? null
}, { immediate: true })

const subgroupLocked = computed(() => !!permission.value?.allowedSubgroupId)
const canLecture = computed(() => !permission.value?.allowedLessonType || permission.value.allowedLessonType === 'LECTURE')
const canPractice = computed(() => !permission.value?.allowedLessonType || permission.value.allowedLessonType === 'PRACTICE')

// Reset counts of types the teacher can't use
watch([canLecture, canPractice], ([lec, prac]) => {
  if (!lec)
    state.lectureCount = 0
  if (!prac)
    state.practiceCount = 0
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

    <div v-if="loadingScope" class="flex flex-col gap-4">
      <USkeleton class="h-12" />
      <USkeleton class="h-12" />
      <USkeleton class="h-12" />
    </div>

    <UAlert
      v-else-if="!permission"
      color="warning"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Нет назначения"
      description="У вас нет назначения по данному предмету."
    />

    <UForm
      v-else
      ref="form"
      :schema="CreateLessonsSchema"
      :state="state"
      class="flex flex-col gap-4"
    >
      <UFormField label="Подгруппа" name="subgroupId">
        <SubgroupSelect
          v-if="!subgroupLocked"
          v-model="state.subgroupId"
          :group-id="state.groupId"
        />
        <UInput
          v-else
          :model-value="permission?.allowedSubgroupIndex != null ? `Подгруппа ${permission.allowedSubgroupIndex}` : ''"
          disabled
          class="w-full"
        />
      </UFormField>

      <div
        v-if="canLecture || canPractice"
        class="grid gap-4"
        :class="canLecture && canPractice ? 'grid-cols-2' : 'grid-cols-1'"
      >
        <UFormField v-if="canLecture" label="Количество лекций" name="lectureCount" required>
          <UInput
            v-model.number="state.lectureCount"
            type="number"
            :min="0"
            class="w-full"
          />
        </UFormField>

        <UFormField v-if="canPractice" label="Количество практик" name="practiceCount" required>
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
          :disabled="!state.groupId || (!canLecture && !canPractice)"
          @click="handleCreate"
        >
          Создать занятия
        </UButton>
      </div>
    </UForm>
  </div>
</template>
