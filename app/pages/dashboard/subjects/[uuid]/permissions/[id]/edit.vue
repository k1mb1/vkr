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

// ── Seed from history state (passed by list page) or fetch fallback ────────

const seedPermission = (history.state?.permission ?? null) as TeacherSubjectPermissionResponse | null

const { data: allPermissions, pending: loadingFallback } = useBackend(
  '/api/teacher-subject-permissions',
  {
    method: 'GET',
    query: { subjectId },
    immediate: !seedPermission,
  },
)

const permission = computed<TeacherSubjectPermissionResponse | undefined>(() => {
  if (seedPermission)
    return seedPermission
  return (allPermissions.value ?? []).find(p => p.id === permissionId)
})

// ── My scope ─────────────────────────────────────────────

const { groupOptions, subgroupOptionsFor, lessonTypeOptionsFor, loadingScope } = useMyPermissionScope(subjectId)

// ── Form state ────────────────────────────────────────────

const state = reactive<Schema>({
  teacherId: '',
  groupId: '',
  allowedSubgroupId: null,
  allowedLessonType: null,
})

watch(
  permission,
  (p) => {
    if (!p)
      return
    state.teacherId = p.teacherId ?? ''
    state.groupId = p.groupId ?? ''
    state.allowedSubgroupId = p.allowedSubgroupId ?? null
    state.allowedLessonType = (p.allowedLessonType as LessonType | null | undefined) ?? null
  },
  { immediate: true },
)

// Reset downstream when group or subgroup changes (only for user-driven changes,
// not when seeding from existing permission)
const seeded = ref(false)
watch(permission, (p) => {
  if (p)
    seeded.value = true
}, { immediate: true })

watch(() => state.groupId, () => {
  if (!seeded.value)
    return
  state.allowedSubgroupId = null
  state.allowedLessonType = null
})
watch(() => state.allowedSubgroupId, (_, old) => {
  if (!seeded.value || old === null)
    return
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
    await $backend('/api/teacher-subject-permissions/{id}', {
      method: 'PATCH',
      path: { id: permissionId },
      body: {
        teacherId: data.teacherId,
        groupId: data.groupId,
        allowedSubgroupId: data.allowedSubgroupId ?? undefined,
        allowedLessonType: data.allowedLessonType ?? undefined,
      },
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

const isReady = computed(() => !!permission.value)
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

    <div v-if="loadingFallback && !seedPermission" class="flex flex-col gap-4">
      <USkeleton class="h-12" />
      <USkeleton class="h-12" />
      <USkeleton class="h-12" />
    </div>

    <UAlert
      v-else-if="!isReady"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Назначение не найдено"
      description="Не удалось загрузить данные назначения."
    />

    <UForm
      v-else
      ref="form"
      :schema="UpdatePermissionSchema"
      :state="state"
      class="flex flex-col gap-4"
    >
      <UFormField label="Преподаватель" name="teacherId" required>
        <TeacherSelectMenu
          v-model="state.teacherId"
          :initial-label="permission?.teacherName"
        />
      </UFormField>

      <UFormField label="Группа" name="groupId" required>
        <USelect
          v-model="state.groupId"
          :items="groupOptions"
          :loading="loadingScope"
          placeholder="Выберите группу..."
          class="w-full"
        />
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
          @click="handleUpdate"
        >
          Сохранить изменения
        </UButton>
      </div>
    </UForm>
  </div>
</template>
