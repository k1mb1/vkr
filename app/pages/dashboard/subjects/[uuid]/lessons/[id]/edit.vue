<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'
import * as v from 'valibot'

type LessonResponse = components['schemas']['LessonResponse']
type UpdateLessonRequest = components['schemas']['UpdateLessonRequest']
type LessonType = NonNullable<UpdateLessonRequest['type']>

const UpdateLessonSchema = v.object({
  topic: v.optional(v.string()),
  startedAt: v.pipe(v.string(), v.isoDate('Введите корректную дату')),
  type: v.picklist(['LECTURE', 'PRACTICE'] as LessonType[], 'Выберите тип занятия'),
})
type Schema = v.InferOutput<typeof UpdateLessonSchema>

const route = useRoute()
const subjectId = String(route.params.uuid ?? '')
const lessonId = String(route.params.id ?? '')

// ── Seed from history state (passed by list page) ─────────

const targetLesson = (history.state?.lesson ?? null) as LessonResponse | null

// ── My scopes ────────────────────────────────────────────

const { permission: myPermission, scopes: myScopes, pending: loadingScope } = usePermissions()

// Check if teacher has access to this lesson
const hasAccess = computed(() => {
  if (!targetLesson)
    return false
  if (myPermission.value?.allPermissions)
    return true
  const teacherGroupIds = new Set(
    myScopes.value.map(s => s.group?.id).filter((id): id is string => !!id),
  )
  return (targetLesson.scopes ?? []).some(ls => !!ls.groupId && teacherGroupIds.has(ls.groupId))
})

// Find matching scope for restrictions (first match)
const matchingScope = computed(() => {
  if (!targetLesson)
    return null
  const lessonGroupId = (targetLesson.scopes ?? [])[0]?.groupId
  if (!lessonGroupId)
    return null
  return myScopes.value.find(s => s.group?.id === lessonGroupId) ?? null
})

const lessonTypeLocked = computed(() => !!matchingScope.value?.allowedLessonType)

const original = ref({
  topic: targetLesson?.topic ?? '',
  startedAt: targetLesson?.startedAt ?? '',
  type: targetLesson?.type ?? 'LECTURE',
})

const typeOptions = [
  { value: 'LECTURE' as LessonType, label: 'Лекция' },
  { value: 'PRACTICE' as LessonType, label: 'Практика' },
]

// ── Submit ────────────────────────────────────────────────

const { $backend } = useNuxtApp()

const { state, formRef, loading, handleSubmit } = useResourceForm<typeof UpdateLessonSchema, Schema>({
  initialState: () => ({
    topic: targetLesson?.topic ?? '',
    startedAt: targetLesson?.startedAt ?? '',
    type: (targetLesson?.type as LessonType) ?? 'LECTURE',
  }),
  successMessage: 'Занятие обновлено',
  onSuccess: () => navigateTo(`/dashboard/subjects/${subjectId}/lessons`),
})

async function handleUpdate() {
  await handleSubmit((data) => {
    const body: UpdateLessonRequest = {}
    if (data.topic !== undefined && data.topic !== original.value.topic)
      body.topic = data.topic
    if (data.startedAt !== original.value.startedAt)
      body.startedAt = data.startedAt
    if (data.type !== original.value.type)
      body.type = data.type

    return $backend('/api/lessons/{id}', {
      method: 'PATCH',
      path: { id: lessonId },
      body,
    })
  })
}

const isReady = !!targetLesson
</script>

<template>
  <div class="flex flex-col gap-4">
    <UPageHeader title="Редактирование занятия">
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
      v-if="!isReady"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Занятие не найдено"
      description="Откройте занятие из списка."
    />

    <UAlert
      v-else-if="!loadingScope && !myPermission"
      color="warning"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Нет назначения"
      description="У вас нет назначения по данному предмету."
    />

    <UAlert
      v-else-if="!loadingScope && !hasAccess"
      color="warning"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Нет доступа"
      description="Это занятие не входит в ваши разрешённые доступы."
    />

    <UForm
      v-else
      ref="formRef"
      :schema="UpdateLessonSchema"
      :state="state"
      class="flex flex-col gap-4"
    >
      <UFormField label="Тема" name="topic">
        <UInput
          v-model="state.topic"
          placeholder="Введите тему занятия"
          class="w-full"
        />
      </UFormField>

      <UFormField label="Дата" name="startedAt" required>
        <UInput
          v-model="state.startedAt"
          type="date"
          class="w-full"
        />
      </UFormField>

      <UFormField label="Тип занятия" name="type" required>
        <USelect
          v-if="!lessonTypeLocked"
          v-model="state.type"
          :items="typeOptions"
          class="w-full"
        />
        <UInput
          v-else
          :model-value="matchingScope?.allowedLessonType === 'LECTURE' ? 'Лекция' : 'Практика'"
          disabled
          class="w-full"
        />
      </UFormField>

      <UFormField label="Группы">
        <UInput
          :model-value="targetLesson?.allGroups ? 'Все группы' : (targetLesson?.scopes ?? []).map(s => s.groupName ?? '—').join(', ')"
          disabled
          class="w-full"
        />
      </UFormField>

      <div class="flex justify-end gap-2">
        <UButton
          :to="`/dashboard/subjects/${subjectId}/lessons`"
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
