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

const { permission, pending: loadingScope } = usePermissions()

// Teachers already assigned to this subject — exclude from the picker
const { data: subjectPermissions } = useBackend('/api/teacher-subject-permissions', {
  method: 'GET',
  key: `subject-permissions:${subjectId}`,
  query: { subjectId },
})

const excludedTeacherIds = computed<string[]>(() =>
  (subjectPermissions.value ?? [])
    .map(p => p.teacherId)
    .filter((id): id is string => !!id),
)

const state = reactive<Schema>({
  teacherId: '',
  subjectId,
  groupId: '',
  allowedSubgroupId: null,
  allowedLessonType: null,
})

// Seed scope from the single permission
watch(permission, (p) => {
  if (!p)
    return
  state.groupId = p.groupId ?? ''
  state.allowedSubgroupId = p.allowedSubgroupId ?? null
  state.allowedLessonType = (p.allowedLessonType as LessonType | null | undefined) ?? null
}, { immediate: true })

const subgroupLocked = computed(() => !!permission.value?.allowedSubgroupId)
const lessonTypeLocked = computed(() => !!permission.value?.allowedLessonType)

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
  <div class="flex flex-col gap-6">
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

    <div v-if="loadingScope" class="flex flex-col gap-4">
      <USkeleton v-for="i in 3" :key="i" class="h-12" />
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
      :schema="CreatePermissionSchema"
      :state="state"
      class="flex flex-col gap-4"
    >
      <UFormField label="Преподаватель" name="teacherId" required>
        <TeacherSelectMenu v-model="state.teacherId" :exclude="excludedTeacherIds" />
      </UFormField>

      <UFormField label="Группа" name="groupId" required>
        <UInput
          :model-value="permission?.groupName ?? ''"
          disabled
          class="w-full"
        />
      </UFormField>

      <UFormField label="Подгруппа" name="allowedSubgroupId">
        <SubgroupSelect
          v-if="!subgroupLocked"
          v-model="state.allowedSubgroupId"
          :group-id="state.groupId"
        />
        <UInput
          v-else
          :model-value="permission?.allowedSubgroupIndex != null ? `Подгруппа ${permission.allowedSubgroupIndex}` : ''"
          disabled
          class="w-full"
        />
      </UFormField>

      <UFormField label="Тип занятия" name="allowedLessonType">
        <LessonTypeScopeSelect
          v-if="!lessonTypeLocked"
          v-model="state.allowedLessonType"
        />
        <UInput
          v-else
          :model-value="permission?.allowedLessonType === 'LECTURE' ? 'Лекция' : 'Практика'"
          disabled
          class="w-full"
        />
      </UFormField>

      <UButton
        type="button"
        icon="i-lucide-check"
        :loading="loading"
        class="ml-auto"
        @click="handleCreate"
      >
        Создать назначение
      </UButton>
    </UForm>
  </div>
</template>
