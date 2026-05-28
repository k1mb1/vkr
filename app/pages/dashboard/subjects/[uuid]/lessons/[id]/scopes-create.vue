<script setup lang="ts">
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

const { $backend } = useNuxtApp()
const toast = useToast()

const { state, formRef, loading, handleSubmit, onError } = useResourceForm<typeof LessonScopeFormSchema>({
  initialState: initialLessonScopeFormState,
})

const { data: groups, pending: groupsPending } = useBackend('/api/groups/by-subject', {
  method: 'GET',
  query: { subjectId },
})

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
    // backend's BulkAddLessonScopesRequest ref'd Item type requires `id`,
    // but new scopes have none; backend accepts the array without ids.
    () => $backend('/api/lessons/{lessonId}/scopes', {
      method: 'POST',
      path: { lessonId },
      body: { items: requests } as any,
    }),
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
