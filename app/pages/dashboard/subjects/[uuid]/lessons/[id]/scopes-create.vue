<script setup lang="ts">
import type { BulkAddLessonScopesRequest } from '#hey-api'
import { addLessonScopes, getGroupsBySubject } from '#hey-api'
import {
  buildLessonScopeRequests,
  initialLessonScopeFormState,
  initLessonScopeGroups,
  LessonScopeFormSchema,
  validateLessonScopeForm,
} from '~/composables/useLessonScopeForm'

definePageMeta({ middleware: 'subject-permission' })

const route = useRoute()
const subjectId = String(route.params.uuid ?? '')
const lessonId = String(route.params.id ?? '')

const toast = useToast()

const { state, formRef, loading, handleSubmit, onError } = useResourceForm<typeof LessonScopeFormSchema>({
  initialState: initialLessonScopeFormState,
})

const { data: groups, pending: groupsPending } = useApi(
  { key: `groups-by-subject:${subjectId}` },
  () => getGroupsBySubject({ query: { subjectId } }),
)

watch(groups, (val) => {
  if (val)
    initLessonScopeGroups(state, val)
}, { immediate: true })

async function handleCreate() {
  const errs = validateLessonScopeForm(state)
  if (errs.length) {
    toast.add({
      title: 'Исправьте ошибки',
      description: errs.join(' · '),
      color: 'error',
      icon: 'i-lucide-circle-alert',
    })
    return
  }

  const requests = buildLessonScopeRequests(state)

  await handleSubmit(
    // Схема ref'ает Item с обязательным `id` (общий тип для нескольких
    // bulk-эндпоинтов), но у новых scope'ов id ещё нет — бэкенд принимает
    // массив без id. Каст только тела: path/method остаются типизированными.
    () => addLessonScopes({ path: { lessonId }, body: { items: requests } as BulkAddLessonScopesRequest }),
    {
      successMessage: requests.length > 1
        ? `Добавлено проведений: ${requests.length}`
        : 'Проведение добавлено',
      onSuccess: () => navigateTo(`/dashboard/subjects/${subjectId}/lessons`),
    },
  )
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <UPageHeader title="Добавить проведение">
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
      color="neutral"
      variant="soft"
      icon="i-lucide-info"
      title="Что такое проведение"
      description="Проведение — это когда и для кого проходит занятие: выберите группы (при необходимости конкретные подгруппы) и дату. Можно добавить сразу несколько проведений — например, если занятие идёт у разных групп в разные дни."
    />

    <UForm
      ref="formRef"
      :schema="LessonScopeFormSchema"
      :state="state"
      class="flex flex-col gap-6"
      @error="onError"
    >
      <LessonsScopeForm :state="state" :loading="groupsPending" />

      <UButton
        icon="i-lucide-check"
        type="button"
        :loading="loading"
        class="ml-auto"
        @click="handleCreate"
      >
        Сохранить
      </UButton>
    </UForm>
  </div>
</template>
