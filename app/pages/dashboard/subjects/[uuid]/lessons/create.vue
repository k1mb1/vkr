<script setup lang="ts">
import type { BulkCreateLessonsRequest } from '#hey-api'
import * as v from 'valibot'
import { bulkCreate } from '#hey-api'
import { nonNegativeInteger, uuidV4 } from '~/utils/validation'

definePageMeta({ middleware: 'subject-permission' })

const CreateLessonsSchema: SchemaFor<BulkCreateLessonsRequest> = v.pipe(
  v.object({
    subjectId: uuidV4(),
    lectureCount: nonNegativeInteger(),
    practiceCount: nonNegativeInteger(),
  }),
  v.forward(
    v.check(
      d => d.lectureCount > 0 || d.practiceCount > 0,
      'Укажите хотя бы одно занятие',
    ),
    ['practiceCount'],
  ),
  v.forward(
    v.check(
      d => d.lectureCount > 0 || d.practiceCount > 0,
      'Укажите хотя бы одно занятие',
    ),
    ['lectureCount'],
  ),
)

const route = useRoute()
const subjectId = String(route.params.uuid ?? '')

const { permission } = usePermissions()

const { state, formRef, loading, onSubmit, onError } = useResourceForm<typeof CreateLessonsSchema>({
  initialState: () => ({
    subjectId,
    lectureCount: 0,
    practiceCount: 0,
  }),
})

const handleCreate = onSubmit(
  data => bulkCreate({ body: data }),
  {
    onSuccess: () => navigateTo(`/dashboard/subjects/${subjectId}/lessons`),
  },
)
</script>

<template>
  <div class="flex flex-col gap-6">
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
      v-if="!permission"
      color="warning"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Нет назначения"
      description="У вас нет назначения по данному предмету."
    />

    <UAlert
      v-else-if="!permission.allPermissions"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Недостаточно прав"
      description="Создавать занятия могут только преподаватели с доступом ко всем группам предмета."
    />

    <UForm
      v-else
      ref="formRef"
      :schema="CreateLessonsSchema"
      :state="state"
      class="flex flex-col gap-4"
      @submit="handleCreate"
      @error="onError"
    >
      <UAlert
        color="neutral"
        variant="soft"
        icon="i-lucide-info"
        title="Создание занятий по количеству"
        description="Укажите, сколько лекций и практик создать — они появятся пустыми, пронумерованными по порядку. Темы, даты проведения (группы) и задания добавляются позже на странице каждого занятия."
      />

      <UFormField label="Количество лекций" name="lectureCount" required>
        <UInput
          v-model.number="state.lectureCount"
          type="number"
          :min="0"
          class="w-full"
        />
      </UFormField>

      <UFormField label="Количество практик" name="practiceCount" required>
        <UInput
          v-model.number="state.practiceCount"
          type="number"
          :min="0"
          class="w-full"
        />
      </UFormField>

      <UButton
        type="submit"
        icon="i-lucide-check"
        :loading="loading"
        class="ml-auto"
      >
        Создать занятия
      </UButton>
    </UForm>
  </div>
</template>
