<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'
import type { Form } from '#ui/types'
import type { FetchError } from 'ofetch'
import * as v from 'valibot'
import { uuidV4 } from '~/utils/validation'

type CreateTeacherSubjectPermissionRequest = components['schemas']['CreateTeacherSubjectPermissionRequest']
type LessonType = NonNullable<CreateTeacherSubjectPermissionRequest['allowedLessonType']>

const CreatePermissionSchema = v.object({
  teacherId: uuidV4('Выберите преподавателя'),
  subjectId: uuidV4('ID предмета обязателен'),
  groupId: uuidV4('Выберите группу'),
  allowedSubgroupId: v.optional(v.nullable(v.pipe(v.string(), v.uuid()))),
  allowedLessonType: v.optional(v.nullable(v.picklist(['LECTURE', 'PRACTICE'] as LessonType[]))),
})
type Schema = v.InferOutput<typeof CreatePermissionSchema>

const route = useRoute()
const subjectId = String(route.params.uuid ?? '')

const { $backend } = useNuxtApp()
const { toastError } = useApiError()
const toast = useToast()

// ── My scope ─────────────────────────────────────────────

const { groupOptions, subgroupOptionsFor, lessonTypeOptionsFor } = useMyPermissionScope(subjectId)

const state = reactive<Schema>({
  teacherId: '',
  subjectId,
  groupId: '',
  allowedSubgroupId: null,
  allowedLessonType: null,
})

// Auto-select the single group from the teacher's own permissions
watch(groupOptions, (opts) => {
  if (opts.length > 0 && !state.groupId)
    state.groupId = opts[0]!.value
}, { immediate: true })

watch(() => state.groupId, () => {
  state.allowedSubgroupId = null
  state.allowedLessonType = null
})
watch(() => state.allowedSubgroupId, () => {
  state.allowedLessonType = null
})

const subgroupOptions = computed(() => subgroupOptionsFor(state.groupId))
const lessonTypeOptions = computed(() => lessonTypeOptionsFor(state.groupId, state.allowedSubgroupId))

// USelect requires string | undefined, but state.allowedSubgroupId is string | null | undefined
const restrictedSubgroupModel = computed({
  get: () => state.allowedSubgroupId ?? undefined,
  set: (val: string | undefined) => { state.allowedSubgroupId = val ?? null },
})

// ── Submit ────────────────────────────────────────────────

const loading = ref(false)
const formRef = useTemplateRef<Form<typeof CreatePermissionSchema>>('form')

async function handleCreate() {
  const data = await formRef.value?.validate({ transform: true })
  if (!data)
    return

  loading.value = true
  try {
    await $backend('/api/teacher-subject-permissions', {
      method: 'POST',
      body: {
        teacherId: data.teacherId,
        subjectId: data.subjectId,
        groupId: data.groupId,
        allowedSubgroupId: data.allowedSubgroupId ?? undefined,
        allowedLessonType: data.allowedLessonType ?? undefined,
      },
    })
    toast.add({ title: 'Назначение создано', color: 'success', icon: 'i-lucide-check' })
    await navigateTo(`/dashboard/subjects/${subjectId}/permissions`)
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
    <UPageHeader title="Новое назначение">
      <template #links>
        <UButton
          :to="`/dashboard/subjects/${subjectId}/permissions`"
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="ghost"
          label="Назад"
        />
      </template>
    </UPageHeader>

    <UForm
      ref="form"
      :schema="CreatePermissionSchema"
      :state="state"
      class="flex flex-col gap-4"
    >
      <UFormField label="Преподаватель" name="teacherId" required>
        <TeacherSelectMenu v-model="state.teacherId" />
      </UFormField>

      <UFormField label="Подгруппа" name="allowedSubgroupId">
        <!-- Full access: use normal SubgroupSelect -->
        <SubgroupSelect
          v-if="subgroupOptions === null"
          v-model="state.allowedSubgroupId"
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

      <UFormField label="Тип занятия" name="allowedLessonType">
        <USelect
          v-model="state.allowedLessonType"
          :items="lessonTypeOptions"
          :disabled="!state.groupId"
          class="w-full"
        />
      </UFormField>

      <div class="flex justify-end gap-2">
        <UButton
          :to="`/dashboard/subjects/${subjectId}/permissions`"
          color="neutral"
          variant="ghost"
          type="button"
        >
          Отмена
        </UButton>
        <UButton
          type="button"
          icon="i-lucide-check"
          :loading="loading"
          @click="handleCreate"
        >
          Создать назначение
        </UButton>
      </div>
    </UForm>
  </div>
</template>
