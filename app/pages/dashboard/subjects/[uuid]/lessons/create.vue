<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'
import type { Form } from '#ui/types'
import type { FetchError } from 'ofetch'
import * as v from 'valibot'
import { nonNegativeInteger, uuidV4 } from '~/utils/validation'

type CreateLessonsByTypeRequest = components['schemas']['CreateLessonsByTypeRequest']
type LessonScopeRequest = components['schemas']['LessonScopeRequest']

interface ScopeState {
  groupId: string
  allowedSubgroupId: string | null
}

const CreateLessonsSchema = v.pipe(
  v.object({
    subjectId: uuidV4(),
    allGroups: v.boolean(),
    scopes: v.array(v.object({
      groupId: uuidV4(),
      allowedSubgroupId: v.optional(v.nullable(v.pipe(v.string(), v.uuid()))),
    })),
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

// ── My scopes ────────────────────────────────────────────

const { permission, scopes: myScopes, pending: loadingScope } = usePermissions()

const teacherAllGroups = computed(() => permission.value?.allPermissions ?? false)

function myScopeForGroup(groupId: string) {
  return myScopes.value.find(s => s.group?.id === groupId)
}

const scopeState = reactive<ScopeState>({
  groupId: '',
  allowedSubgroupId: null,
})

const state = reactive<Schema>({
  subjectId,
  allGroups: teacherAllGroups.value,
  scopes: [],
  lectureCount: 0,
  practiceCount: 0,
})

watch(() => scopeState.groupId, (gid, oldGid) => {
  if (gid !== oldGid)
    scopeState.allowedSubgroupId = null
  if (gid) {
    state.scopes = [{ groupId: gid, allowedSubgroupId: scopeState.allowedSubgroupId }]
  }
  else {
    state.scopes = []
  }
}, { immediate: true })

watch(() => scopeState.allowedSubgroupId, (sid) => {
  if (state.scopes[0])
    state.scopes[0].allowedSubgroupId = sid
})

const selectedScope = computed(() => myScopeForGroup(scopeState.groupId))
const canLecture = computed(() => !selectedScope.value?.allowedLessonType || selectedScope.value.allowedLessonType === 'LECTURE')
const canPractice = computed(() => !selectedScope.value?.allowedLessonType || selectedScope.value.allowedLessonType === 'PRACTICE')

// Reset counts of types the teacher can't use
watch([canLecture, canPractice], ([lec, prac]) => {
  if (!lec)
    state.lectureCount = 0
  if (!prac)
    state.practiceCount = 0
})

const loading = ref(false)
const formRef = useTemplateRef<Form<typeof CreateLessonsSchema>>('form')

async function handleCreate() {
  const data = await formRef.value?.validate({ transform: true })
  if (!data)
    return

  if (!data.allGroups && data.scopes.length === 0) {
    toast.add({ title: 'Выберите группу', color: 'error', icon: 'i-lucide-circle-alert' })
    return
  }

  loading.value = true
  try {
    const body: CreateLessonsByTypeRequest = {
      subjectId: data.subjectId,
      allGroups: data.allGroups,
      scopes: data.allGroups ? undefined : data.scopes as LessonScopeRequest[],
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
      :schema="CreateLessonsSchema"
      :state="state"
      class="flex flex-col gap-4"
    >
      <UCheckbox v-if="teacherAllGroups" v-model="state.allGroups" label="Все группы предмета" />

      <template v-if="!state.allGroups">
        <UFormField label="Группа" required>
          <GroupsPermissionScopeSelect v-model="scopeState.groupId" />
        </UFormField>

        <UFormField v-if="scopeState.groupId" label="Подгруппа">
          <SubgroupsSelect
            v-model="scopeState.allowedSubgroupId"
            :group-id="scopeState.groupId"
            :allowed-subgroup-id="myScopeForGroup(scopeState.groupId)?.allowedSubgroup?.id"
          />
        </UFormField>
      </template>

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

      <UButton
        icon="i-lucide-check"
        :loading="loading"
        :disabled="(!state.allGroups && state.scopes.length === 0) || (!canLecture && !canPractice)"
        class="ml-auto"
        @click="handleCreate"
      >
        Создать занятия
      </UButton>
    </UForm>
  </div>
</template>
