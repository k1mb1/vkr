<script setup lang="ts">
import type { AttendanceAudienceScope, LessonResponse, UpdateLessonHeaderRequest, UpdateLessonRequest } from '#hey-api'
import * as v from 'valibot'
import { getGroupsBySubject, updateLesson } from '#hey-api'
import {
  initialLessonScopeFormState,
  initLessonScopeGroups,
  validateLessonScopeForm,
} from '~/composables/useLessonScopeForm'

definePageMeta({ middleware: 'subject-permission' })

type LessonType = NonNullable<UpdateLessonHeaderRequest['type']>
type LessonScopeAudienceRequest = AttendanceAudienceScope

interface ScopeReplaceItem {
  id: string
  startedAt?: string
  audience?: LessonScopeAudienceRequest
}

const UpdateLessonSchema = v.object({
  topic: v.optional(v.string()),
  type: v.picklist(['LECTURE', 'PRACTICE'] as LessonType[], 'Выберите тип занятия'),
})

const route = useRoute()
const subjectId = String(route.params.uuid ?? '')
const lessonId = String(route.params.id ?? '')

// ── Seed from history state (passed by list page) ─────────

const targetLesson = (history.state?.lesson ?? null) as LessonResponse | null
const existingScopes = targetLesson?.scopes ?? []
const hasScopes = existingScopes.length > 0

// ── My scopes ────────────────────────────────────────────

const { permission: myPermission, scopes: myScopes, pending: loadingScope } = usePermissions()

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

const matchingScope = computed(() => {
  if (!targetLesson)
    return null
  const lessonGroupId = (targetLesson.scopes ?? [])[0]?.groupId
  if (!lessonGroupId)
    return null
  return myScopes.value.find(s => s.group?.id === lessonGroupId) ?? null
})

const lessonTypeLocked = computed(() => !!matchingScope.value?.allowedLessonType)

const typeOptions = [
  { value: 'LECTURE' as LessonType, label: 'Лекция' },
  { value: 'PRACTICE' as LessonType, label: 'Практика' },
]

// ── Header form ───────────────────────────────────────────

const toast = useToast()

const { state, formRef, loading, dirtyFields, validate, submit, onError } = useResourceForm<typeof UpdateLessonSchema>({
  initialState: () => ({
    topic: targetLesson?.topic ?? '',
    type: (targetLesson?.type as LessonType) ?? 'LECTURE',
  }),
})

// ── Scope form (only when lesson has existing scopes) ─────

const scopeState = reactive(initialLessonScopeFormState())

const { data: groups, pending: groupsPending } = useApi(
  { key: `groups-by-subject:${subjectId}` },
  () => getGroupsBySubject({ query: { subjectId } }),
)

watch(groups, (val) => {
  if (!val || !hasScopes)
    return
  initLessonScopeGroups(scopeState, val)

  if (existingScopes.some(s => s.allGroups)) {
    scopeState.mode = 'all'
    scopeState.allGroupsDate = existingScopes.find(s => s.allGroups)?.startedAt ?? ''
    return
  }

  scopeState.mode = 'groups'
  for (const entry of scopeState.groupEntries) {
    const grouped = existingScopes.filter(s => s.groupId === entry.groupId)
    if (!grouped.length)
      continue
    if (grouped.length === 1 && !grouped[0]?.allowedSubgroupId) {
      entry.date = grouped[0]?.startedAt ?? ''
    }
    else {
      entry.splitBySubgroups = true
      for (const sub of entry.subgroupEntries) {
        const match = grouped.find(s => s.allowedSubgroupId === sub.subgroupId)
        if (match)
          sub.date = match.startedAt ?? ''
      }
    }
  }
}, { immediate: true })

function buildScopeItems(): ScopeReplaceItem[] {
  const items: ScopeReplaceItem[] = []

  if (scopeState.mode === 'all') {
    const allScope = existingScopes.find(s => s.allGroups)
    if (allScope?.id)
      items.push({ id: allScope.id, startedAt: scopeState.allGroupsDate })
    return items
  }

  for (const scope of existingScopes) {
    if (!scope.id || scope.allGroups)
      continue

    const entry = scopeState.groupEntries.find(e => e.groupId === scope.groupId)
    if (!entry)
      continue

    if (!entry.splitBySubgroups) {
      const item: ScopeReplaceItem = { id: scope.id, startedAt: entry.date }
      if (scope.allowedSubgroupId)
        item.audience = { groupId: entry.groupId }
      items.push(item)
    }
    else {
      const sub = scope.allowedSubgroupId
        ? entry.subgroupEntries.find(s => s.subgroupId === scope.allowedSubgroupId)
        : entry.subgroupEntries[0]
      if (!sub)
        continue

      const item: ScopeReplaceItem = { id: scope.id, startedAt: sub.date }
      if (!scope.allowedSubgroupId)
        item.audience = { groupId: entry.groupId, allowedSubgroupId: sub.subgroupId }
      items.push(item)
    }
  }

  return items
}

async function handleUpdate() {
  const headerData = await validate()
  if (!headerData)
    return

  if (hasScopes) {
    const errs = validateLessonScopeForm(scopeState)
    if (errs.length) {
      toast.add({
        title: 'Исправьте ошибки',
        description: errs.join(' · '),
        color: 'error',
        icon: 'i-lucide-circle-alert',
      })
      return
    }
  }

  const body: UpdateLessonRequest = {}
  const headerPatch: UpdateLessonHeaderRequest = {}
  if (dirtyFields.value.has('topic'))
    headerPatch.topic = headerData.topic
  if (dirtyFields.value.has('type'))
    headerPatch.type = headerData.type
  if (Object.keys(headerPatch).length)
    body.header = headerPatch

  if (hasScopes) {
    const items = buildScopeItems()
    if (items.length)
      body.scopes = { items } as UpdateLessonRequest['scopes']
  }

  if (!body.header && !body.scopes) {
    toast.add({
      title: 'Нет изменений',
      color: 'neutral',
      icon: 'i-lucide-info',
    })
    return
  }

  await submit(
    () => updateLesson({ path: { id: lessonId }, body }),
    {
      successMessage: 'Занятие обновлено',
      onSuccess: () => navigateTo(`/dashboard/subjects/${subjectId}/lessons`),
    },
  )
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
      class="flex flex-col gap-6"
      @error="onError"
    >
      <UAlert
        color="neutral"
        variant="soft"
        icon="i-lucide-info"
        title="Что можно изменить"
        description="Здесь меняются тема и тип занятия, а также даты его проведения для групп. Тип может быть заблокирован, если ваш доступ ограничен конкретным типом занятий. Задания настраиваются отдельно — на странице занятия."
      />

      <div class="flex flex-col gap-4">
        <UFormField label="Тема" name="topic">
          <UInput
            v-model="state.topic"
            placeholder="Введите тему занятия"
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
      </div>

      <template v-if="hasScopes">
        <USeparator label="Проведение" />
        <LessonsScopeForm :state="scopeState" :loading="groupsPending" />
      </template>

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
          icon="i-lucide-check"
          type="button"
          :loading="loading"
          @click="handleUpdate"
        >
          Сохранить изменения
        </UButton>
      </div>
    </UForm>
  </div>
</template>
