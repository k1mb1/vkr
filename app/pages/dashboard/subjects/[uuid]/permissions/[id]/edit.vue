<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'
import type { Form } from '#ui/types'
import type { FetchError } from 'ofetch'
import * as v from 'valibot'
import { uuidV4 } from '~/utils/validation'

type TeacherSubjectPermissionResponse = components['schemas']['TeacherSubjectPermissionResponse']
type UpdateTeacherSubjectPermissionRequest = components['schemas']['UpdateTeacherSubjectPermissionRequest']
type LessonType = NonNullable<UpdateTeacherSubjectPermissionRequest['allowedLessonType']>

const UpdatePermissionSchema = v.object({
  teacherId: uuidV4('Выберите преподавателя'),
  groupId: uuidV4('Выберите группу'),
  allowedSubgroupId: v.optional(v.nullable(v.pipe(v.string(), v.uuid()))),
  allowedLessonType: v.optional(v.nullable(v.picklist(['LECTURE', 'PRACTICE'] as LessonType[]))),
})
type Schema = v.InferOutput<typeof UpdatePermissionSchema>

const route = useRoute()
const subjectId = String(route.params.uuid ?? '')
const permissionId = String(route.params.id ?? '')

// ── Seed from history state (passed by list page) ─────────

const targetPermission = (history.state?.permission ?? null) as TeacherSubjectPermissionResponse | null

// ── My scope ─────────────────────────────────────────────

const { permission: myPermission, pending: loadingScope } = usePermissions()

const subgroupLocked = computed(() => !!myPermission.value?.allowedSubgroupId)
const lessonTypeLocked = computed(() => !!myPermission.value?.allowedLessonType)

// ── Form state ────────────────────────────────────────────

const state = reactive<Schema>({
  teacherId: targetPermission?.teacherId ?? '',
  groupId: targetPermission?.groupId ?? '',
  allowedSubgroupId: targetPermission?.allowedSubgroupId ?? null,
  allowedLessonType: (targetPermission?.allowedLessonType as LessonType | null | undefined) ?? null,
})

const original = ref({
  teacherId: targetPermission?.teacherId ?? '',
  groupId: targetPermission?.groupId ?? '',
  allowedSubgroupId: targetPermission?.allowedSubgroupId ?? null,
  allowedLessonType: targetPermission?.allowedLessonType ?? null,
})

// ── Submit ────────────────────────────────────────────────

const { $backend } = useNuxtApp()
const { toastError } = useApiError()
const toast = useToast()

const loading = ref(false)
const formRef = useTemplateRef<Form<typeof UpdatePermissionSchema>>('form')

async function handleUpdate() {
  const data = await formRef.value?.validate({ transform: true })
  if (!data)
    return

  loading.value = true
  try {
    const body: UpdateTeacherSubjectPermissionRequest = {}
    if (data.teacherId !== original.value.teacherId)
      body.teacherId = data.teacherId
    if (data.groupId !== original.value.groupId)
      body.groupId = data.groupId
    if ((data.allowedSubgroupId ?? null) !== original.value.allowedSubgroupId) {
      body.allowedSubgroupId = data.allowedSubgroupId ?? undefined
    }
    if ((data.allowedLessonType ?? null) !== original.value.allowedLessonType) {
      body.allowedLessonType = data.allowedLessonType ?? undefined
    }

    await $backend('/api/teacher-subject-permissions/{id}', {
      method: 'PATCH',
      path: { id: permissionId },
      body,
    })
    toast.add({ title: 'Назначение обновлено', color: 'success', icon: 'i-lucide-check' })
    await navigateTo(`/dashboard/subjects/${subjectId}/permissions`)
  }
  catch (e) {
    toastError(e as FetchError)
  }
  finally {
    loading.value = false
  }
}

const isReady = !!targetPermission
</script>

<template>
  <div class="flex flex-col gap-4">
    <UPageHeader title="Редактирование назначения">
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

    <UAlert
      v-if="!isReady"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Назначение не найдено"
      description="Откройте назначение из списка."
    />

    <UAlert
      v-else-if="!loadingScope && !myPermission"
      color="warning"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Нет назначения"
      description="У вас нет назначения по данному предмету."
    />

    <UForm
      v-else
      ref="form"
      :schema="UpdatePermissionSchema"
      :state="state"
      class="flex flex-col gap-4"
    >
      <UFormField label="Преподаватель" name="teacherId" required>
        <UInput
          :model-value="targetPermission?.teacherName ?? ''"
          disabled
          class="w-full"
        />
      </UFormField>

      <UFormField label="Группа" name="groupId" required>
        <UInput
          :model-value="targetPermission?.groupName ?? ''"
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
          :model-value="myPermission?.allowedSubgroupIndex != null ? `Подгруппа ${myPermission.allowedSubgroupIndex}` : ''"
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
          :model-value="myPermission?.allowedLessonType === 'LECTURE' ? 'Лекция' : 'Практика'"
          disabled
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
          @click="handleUpdate"
        >
          Сохранить изменения
        </UButton>
      </div>
    </UForm>
  </div>
</template>
