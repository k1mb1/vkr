<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'
import type { SchemaFor } from '~/utils/validation'
import * as v from 'valibot'
import { string } from '~/utils/validation'

definePageMeta({ middleware: 'subject-permission' })

type CreateTeacherSubjectPermissionRequest = components['schemas']['CreateTeacherSubjectPermissionRequest']
type CreatePermissionForm = Omit<CreateTeacherSubjectPermissionRequest, 'subjectId'>

const CreatePermissionSchema: SchemaFor<CreatePermissionForm> = v.object({
  teacherId: string('Выберите преподавателя'),
  allPermissions: v.boolean(),
  scopes: v.optional(v.array(v.object({
    group: v.object({
      groupId: string('Выберите группу'),
      allowedSubgroupId: v.optional(v.string()),
    }),
    allowedLessonType: v.optional(v.picklist(['LECTURE', 'PRACTICE'] as const)),
  }))),
})

const route = useRoute()
const subjectId = String(route.params.uuid ?? '')

const { $backend } = useNuxtApp()

const { permission, pending: loadingScope } = usePermissions()

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

const { data: groups, pending: groupsPending } = useBackend('/api/groups/by-subject', {
  method: 'GET',
  query: { subjectId },
})

const { state, formRef, loading, onSubmit, onError } = useResourceForm<typeof CreatePermissionSchema>({
  initialState: () => ({
    teacherId: '',
    allPermissions: false,
    scopes: [{ group: { groupId: '' } }],
  }),
  successMessage: 'Назначение создано',
})

watch(() => state.allPermissions, (val) => {
  if (val) {
    state.scopes = undefined
  }
  else if (!state.scopes?.length) {
    state.scopes = [{ group: { groupId: '' } }]
  }
})

function addScope() {
  ;(state.scopes ??= []).push({ group: { groupId: '' } })
}

function removeScope(i: number) {
  state.scopes?.splice(i, 1)
}

const handleCreate = onSubmit(
  data => $backend('/api/teacher-subject-permissions', {
    method: 'POST',
    body: { ...data, subjectId } satisfies CreateTeacherSubjectPermissionRequest,
  }),
  {
    onSuccess: () => navigateTo(`/dashboard/subjects/${subjectId}/settings/permissions`),
  },
)
</script>

<template>
  <div class="flex flex-col gap-6">
    <UPageHeader title="Новое назначение">
      <template #links>
        <UButton
          :to="`/dashboard/subjects/${subjectId}/settings/permissions`"
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

    <UForm
      v-else
      ref="formRef"
      :schema="CreatePermissionSchema"
      :state="state"
      class="flex flex-col gap-4"
      @submit="handleCreate"
      @error="onError"
    >
      <UFormField label="Преподаватель" name="teacherId" required>
        <TeachersSelectMenu v-model="state.teacherId" :exclude-id="excludedTeacherIds" />
      </UFormField>

      <UCheckbox v-model="state.allPermissions" label="Все группы предмета" />

      <template v-if="!state.allPermissions">
        <USeparator label="Доступы" />

        <UCard
          v-for="(s, i) in (state.scopes ?? [])"
          :key="i"
          :ui="{ body: 'flex flex-col gap-3' }"
        >
          <template #header>
            <div class="flex items-center justify-between">
              <span class="font-medium">Доступ {{ i + 1 }}</span>
              <UButton
                v-if="(state.scopes?.length ?? 0) > 1"
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                @click="removeScope(i)"
              />
            </div>
          </template>

          <UFormField label="Группа" :name="`scopes.${i}.group.groupId`" required>
            <GroupsSubgroupSelect
              :model-value="{ groupId: s.group!.groupId || null, subgroupId: s.group!.allowedSubgroupId ?? null }"
              :groups="groups ?? []"
              :loading="groupsPending"
              @update:model-value="(v) => { s.group = { groupId: v.groupId ?? '', allowedSubgroupId: v.subgroupId ?? undefined } }"
            />
          </UFormField>

          <UFormField label="Тип занятия">
            <LessonTypesPermissionSelect v-model="s.allowedLessonType" :group-id="s.group!.groupId" />
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
        type="submit"
        icon="i-lucide-check"
        :loading="loading"
        class="ml-auto"
      >
        Создать назначение
      </UButton>
    </UForm>
  </div>
</template>
