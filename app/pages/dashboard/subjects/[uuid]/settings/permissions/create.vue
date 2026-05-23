<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'

type CreateTeacherSubjectPermissionRequest = components['schemas']['CreateTeacherSubjectPermissionRequest']
type PermissionScopeRequest = components['schemas']['PermissionScopeRequest']
type LessonType = NonNullable<PermissionScopeRequest['allowedLessonType']>

interface ScopeState {
  groupId: string
  allowedSubgroupId: string | null
  allowedLessonType: LessonType | null
}

function makeEmptyScope(): ScopeState {
  return { groupId: '', allowedSubgroupId: null, allowedLessonType: null }
}

const route = useRoute()
const subjectId = String(route.params.uuid ?? '')

const { $backend } = useNuxtApp()

const { permission, scopes: myScopes, pending: loadingScope } = usePermissions()

function myScopeForGroup(groupId: string) {
  return myScopes.value.find(s => s.group?.id === groupId)
}

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

// ── Form state ────────────────────────────────────────────

const teacherId = ref<string>('')
const allGroups = ref<boolean>(false)
const scopes = ref<ScopeState[]>([makeEmptyScope()])

function addScope() {
  scopes.value.push(makeEmptyScope())
}

function removeScope(i: number) {
  scopes.value.splice(i, 1)
}

const errors = ref<string[]>([])

function validate(): boolean {
  errors.value = []
  if (!teacherId.value)
    errors.value.push('Выберите преподавателя')
  if (!allGroups.value && scopes.value.length === 0)
    errors.value.push('Добавьте хотя бы один доступ')
  if (!allGroups.value) {
    for (const [i, s] of scopes.value.entries()) {
      if (!s.groupId)
        errors.value.push(`Доступ ${i + 1}: выберите группу`)
    }
  }
  return errors.value.length === 0
}

// ── Submit ────────────────────────────────────────────────

const { loading, submit } = useFormSubmit()

async function handleCreate() {
  if (!validate())
    return

  await submit(
    () => {
      const body: CreateTeacherSubjectPermissionRequest = {
        teacherId: teacherId.value,
        subjectId,
        allPermissions: allGroups.value,
        scopes: allGroups.value
          ? undefined
          : scopes.value.map<PermissionScopeRequest>(s => ({
              groupId: s.groupId,
              allowedSubgroupId: s.allowedSubgroupId ?? undefined,
              allowedLessonType: s.allowedLessonType ?? undefined,
            })),
      }
      return $backend('/api/teacher-subject-permissions', { method: 'POST', body })
    },
    {
      successMessage: 'Назначение создано',
      onSuccess: () => navigateTo(`/dashboard/subjects/${subjectId}/permissions`),
    },
  )
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

    <UAlert
      v-else-if="!permission.allPermissions"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Недостаточно прав"
      description="Создавать назначения могут только преподаватели с доступом ко всем группам предмета."
    />

    <div v-else class="flex flex-col gap-4">
      <UAlert
        v-if="errors.length"
        color="error"
        variant="soft"
        icon="i-lucide-circle-alert"
        title="Исправьте ошибки"
        :description="errors.join(' · ')"
      />

      <UFormField label="Преподаватель" required>
        <TeachersSelectMenu v-model="teacherId" :exclude-id="excludedTeacherIds" />
      </UFormField>

      <UCheckbox v-model="allGroups" label="Все группы предмета" />

      <template v-if="!allGroups">
        <USeparator label="Доступы" />

        <UCard
          v-for="(s, i) in scopes"
          :key="i"
          :ui="{ body: 'flex flex-col gap-3' }"
        >
          <template #header>
            <div class="flex items-center justify-between">
              <span class="font-medium">Доступ {{ i + 1 }}</span>
              <UButton
                v-if="scopes.length > 1"
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                @click="removeScope(i)"
              />
            </div>
          </template>

          <UFormField label="Группа" required>
            <GroupsPermissionScopeSelect v-model="s.groupId" />
          </UFormField>

          <UFormField v-if="s.groupId" label="Подгруппа">
            <SubgroupsSelect
              v-model="s.allowedSubgroupId"
              :group-id="s.groupId"
              :allowed-subgroup-id="myScopeForGroup(s.groupId)?.allowedSubgroup?.id"
            />
          </UFormField>

          <UFormField label="Тип занятия">
            <LessonTypesPermissionSelect v-model="s.allowedLessonType" :group-id="s.groupId" />
          </UFormField>
        </UCard>

        <UButton
          icon="i-lucide-plus"
          label="Добавить доступ"
          color="neutral"
          variant="outline"
          class="self-start"
          @click="addScope"
        />
      </template>

      <UButton
        icon="i-lucide-check"
        :loading="loading"
        class="ml-auto"
        @click="handleCreate"
      >
        Создать назначение
      </UButton>
    </div>
  </div>
</template>
