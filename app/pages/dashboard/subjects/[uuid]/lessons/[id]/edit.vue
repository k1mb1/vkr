<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'
import type { Form } from '#ui/types'
import type { FetchError } from 'ofetch'
import * as v from 'valibot'

type LessonResponse = components['schemas']['LessonResponse']
type UpdateLessonRequest = components['schemas']['UpdateLessonRequest']
type LessonType = NonNullable<UpdateLessonRequest['type']>

const UpdateLessonSchema = v.object({
  topic: v.optional(v.string()),
  startedAt: v.pipe(v.string(), v.isoDate('Введите корректную дату')),
  type: v.picklist(['LECTURE', 'PRACTICE'] as LessonType[], 'Выберите тип занятия'),
  subgroupId: v.optional(v.nullable(v.pipe(v.string(), v.uuid()))),
})
type Schema = v.InferOutput<typeof UpdateLessonSchema>

const route = useRoute()
const subjectId = String(route.params.uuid ?? '')
const lessonId = String(route.params.id ?? '')

// ── Seed from history state (passed by list page) ─────────

const targetLesson = (history.state?.lesson ?? null) as LessonResponse | null

// ── My scope ─────────────────────────────────────────────

const { permission: myPermission, pending: loadingScope } = usePermissions()

const subgroupLocked = computed(() => !!myPermission.value?.allowedSubgroupId)
const lessonTypeLocked = computed(() => !!myPermission.value?.allowedLessonType)

// ── Form state ────────────────────────────────────────────

const state = reactive<Schema>({
  topic: targetLesson?.topic ?? '',
  startedAt: targetLesson?.startedAt ?? '',
  type: (targetLesson?.type as LessonType) ?? 'LECTURE',
  subgroupId: targetLesson?.subgroupId ?? null,
})

const original = ref({
  topic: targetLesson?.topic ?? '',
  startedAt: targetLesson?.startedAt ?? '',
  type: targetLesson?.type ?? 'LECTURE',
  subgroupId: targetLesson?.subgroupId ?? null,
})

const typeOptions = [
  { value: 'LECTURE' as LessonType, label: 'Лекция' },
  { value: 'PRACTICE' as LessonType, label: 'Практика' },
]

// ── Submit ────────────────────────────────────────────────

const { $backend } = useNuxtApp()
const { toastError } = useApiError()
const toast = useToast()

const loading = ref(false)
const formRef = useTemplateRef<Form<typeof UpdateLessonSchema>>('form')

async function handleUpdate() {
  const data = await formRef.value?.validate({ transform: true })
  if (!data)
    return

  loading.value = true
  try {
    const body: UpdateLessonRequest = {}
    if (data.topic !== undefined && data.topic !== original.value.topic)
      body.topic = data.topic
    if (data.startedAt !== original.value.startedAt)
      body.startedAt = data.startedAt
    if (data.type !== original.value.type)
      body.type = data.type
    if ((data.subgroupId ?? null) !== original.value.subgroupId)
      body.subgroupId = data.subgroupId ?? undefined

    await $backend('/api/lessons/{id}', {
      method: 'PATCH',
      path: { id: lessonId },
      body,
    })
    toast.add({ title: 'Занятие обновлено', color: 'success', icon: 'i-lucide-check' })
    await navigateTo(`/dashboard/subjects/${subjectId}/lessons`)
  }
  catch (e) {
    toastError(e as FetchError)
  }
  finally {
    loading.value = false
  }
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

    <UForm
      v-else
      ref="form"
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
          :model-value="myPermission?.allowedLessonType === 'LECTURE' ? 'Лекция' : 'Практика'"
          disabled
          class="w-full"
        />
      </UFormField>

      <UFormField label="Подгруппа" name="subgroupId">
        <SubgroupSelect
          v-if="!subgroupLocked"
          v-model="state.subgroupId"
          :group-id="targetLesson?.groupId ?? ''"
        />
        <UInput
          v-else
          :model-value="myPermission?.allowedSubgroupIndex != null ? `Подгруппа ${myPermission.allowedSubgroupIndex}` : ''"
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
