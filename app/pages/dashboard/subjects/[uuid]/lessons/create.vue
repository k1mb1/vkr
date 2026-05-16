<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'
import type { Form } from '#ui/types'
import type { FetchError } from 'ofetch'
import * as v from 'valibot'
import { nonNegativeInteger, uuidV4 } from '~/utils/validation'

type CreateLessonsByTypeRequest = components['schemas']['CreateLessonsByTypeRequest']
type LessonType = NonNullable<components['schemas']['TeacherSubjectPermissionResponse']['allowedLessonType']>

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

const { groupOptions, subgroupOptionsFor, lessonTypeOptionsFor, loadingScope } = useMyPermissionScope(subjectId)

const state = reactive<Omit<Schema, never>>({
  subjectId,
  groupId: '',
  subgroupId: null,
  lectureCount: 0,
  practiceCount: 0,
})

// Auto-select the single group from the teacher's own permissions
watch(groupOptions, (opts) => {
  if (opts.length > 0 && !state.groupId)
    state.groupId = opts[0]!.value
}, { immediate: true })

watch(() => state.groupId, () => {
  state.subgroupId = null
})

const subgroupOptions = computed(() => subgroupOptionsFor(state.groupId))

const allowedLessonTypes = computed<Set<LessonType>>(() => {
  const opts = lessonTypeOptionsFor(state.groupId, state.subgroupId)
  return new Set(opts.map(o => o.value).filter((v): v is LessonType => v !== null))
})
const canLecture = computed(() => allowedLessonTypes.value.has('LECTURE'))
const canPractice = computed(() => allowedLessonTypes.value.has('PRACTICE'))

// Reset counts of types the teacher can't use
watch([canLecture, canPractice], ([lec, prac]) => {
  if (!lec)
    state.lectureCount = 0
  if (!prac)
    state.practiceCount = 0
})

// USelect requires string | undefined, but state.subgroupId is string | null | undefined
const restrictedSubgroupModel = computed({
  get: () => state.subgroupId ?? undefined,
  set: (val: string | undefined) => { state.subgroupId = val ?? null },
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

    <UAlert
      v-if="!loadingScope && groupOptions.length === 0"
      color="warning"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Нет назначений"
      description="У вас нет назначений по данному предмету."
    />

    <UForm
      v-else
      ref="form"
      :schema="CreateLessonsSchema"
      :state="state"
      class="flex flex-col gap-4"
    >
      <UFormField label="Подгруппа" name="subgroupId">
        <!-- Full access: use normal SubgroupSelect -->
        <SubgroupSelect
          v-if="subgroupOptions === null"
          v-model="state.subgroupId"
          :group-id="state.groupId"
        />
        <!-- Restricted access: show only teacher's own subgroups -->
        <USelect
          v-else
          v-model="restrictedSubgroupModel"
          :items="subgroupOptions"
          :disabled="!state.groupId"
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
