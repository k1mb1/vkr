<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'

type TeacherSubjectPermissionResponse = components['schemas']['TeacherSubjectPermissionResponse']
type UpdateTeacherSubjectPermissionRequest = components['schemas']['UpdateTeacherSubjectPermissionRequest']
type PermissionScopeRequest = components['schemas']['PermissionScopeRequest']
type LessonType = NonNullable<PermissionScopeRequest['allowedLessonType']>

interface ScopeState {
  groupId: string
  allowedSubgroupId: string | null
  allowedLessonType: LessonType | null
}

const route = useRoute()
const subjectId = String(route.params.uuid ?? '')
const permissionId = String(route.params.id ?? '')

// ── Seed from history state (passed by list page) ─────────

const targetPermission = (history.state?.permission ?? null) as TeacherSubjectPermissionResponse | null

// ── Form state ────────────────────────────────────────────

const allGroups = ref<boolean>(targetPermission?.allPermissions ?? false)

const initialScopes: ScopeState[] = (targetPermission?.scopes ?? []).map(s => ({
  groupId: s.group?.id ?? '',
  allowedSubgroupId: s.allowedSubgroup?.id ?? null,
  allowedLessonType: (s.allowedLessonType as LessonType | null | undefined) ?? null,
}))

const scopes = ref<ScopeState[]>(
  initialScopes.length > 0
    ? initialScopes
    : [{ groupId: '', allowedSubgroupId: null, allowedLessonType: null }],
)

function addScope() {
  scopes.value.push({ groupId: '', allowedSubgroupId: null, allowedLessonType: null })
}

function removeScope(i: number) {
  scopes.value.splice(i, 1)
}

const errors = ref<string[]>([])

function validate(): boolean {
  errors.value = []
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

const { $backend } = useNuxtApp()

const { loading, submit } = useFormSubmit()

async function handleUpdate() {
  if (!validate())
    return

  await submit(
    () => {
      const body: UpdateTeacherSubjectPermissionRequest = {
        allPermissions: allGroups.value,
        scopes: allGroups.value
          ? undefined
          : scopes.value.map<PermissionScopeRequest>(s => ({
              groupId: s.groupId,
              allowedSubgroupId: s.allowedSubgroupId ?? undefined,
              allowedLessonType: s.allowedLessonType ?? undefined,
            })),
      }

      return $backend('/api/teacher-subject-permissions/{id}', {
        method: 'PATCH',
        path: { id: permissionId },
        body,
      })
    },
    {
      successMessage: 'Назначение обновлено',
      onSuccess: () => navigateTo(`/dashboard/subjects/${subjectId}/permissions`),
    },
  )
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

    <div v-else class="flex flex-col gap-4">
      <UFormField label="Преподаватель">
        <UInput
          :model-value="targetPermission?.teacherName ?? ''"
          disabled
          class="w-full"
        />
      </UFormField>

      <UCheckbox v-model="allGroups" label="Все группы предмета" />

      <template v-if="!allGroups">
        <USeparator label="Доступы" />

        <UAlert
          v-if="errors.length"
          color="error"
          variant="soft"
          icon="i-lucide-circle-alert"
          title="Исправьте ошибки"
          :description="errors.join(' · ')"
        />

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

          <UFormField label="Тип занятия">
            <LessonTypesPermissionSelect v-model="s.allowedLessonType" :group-id="s.groupId" />
          </UFormField>

          <UFormField v-if="s.groupId" label="Подгруппа">
            <SubgroupsSelect
              v-model="s.allowedSubgroupId"
              :group-id="s.groupId"
            />
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
    </div>
  </div>
</template>
