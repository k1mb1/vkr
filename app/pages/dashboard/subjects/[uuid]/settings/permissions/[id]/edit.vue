<script setup lang="ts">
import type { PermissionScopeRequest, TeacherSubjectPermissionResponse, UpdateTeacherSubjectPermissionRequest } from '#hey-api'
import type { SchemaFor } from '~/utils/validation'
import * as v from 'valibot'
import { getGroupsBySubject, update } from '#hey-api'
import { string } from '~/utils/validation'

definePageMeta({ middleware: 'subject-permission' })

type LessonType = NonNullable<PermissionScopeRequest['allowedLessonType']>
const EditPermissionSchema: SchemaFor<UpdateTeacherSubjectPermissionRequest> = v.object({
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
const permissionId = String(route.params.id ?? '')

const { data: groups, pending: groupsPending } = useApi(
  { key: `groups-by-subject:${subjectId}` },
  () => getGroupsBySubject({ query: { subjectId } }),
)

const targetPermission = (history.state?.permission ?? null) as TeacherSubjectPermissionResponse | null
const isReady = !!targetPermission

const { state, formRef, loading, onSubmit, onError } = useResourceForm<typeof EditPermissionSchema>({
  initialState: () => {
    const seeded = (targetPermission?.scopes ?? []).map<PermissionScopeRequest>(s => ({
      group: {
        groupId: s.group?.id ?? '',
        allowedSubgroupId: s.allowedSubgroup?.id,
      },
      allowedLessonType: s.allowedLessonType as LessonType | undefined,
    }))
    return {
      allPermissions: targetPermission?.allPermissions ?? false,
      scopes: targetPermission?.allPermissions
        ? undefined
        : seeded.length > 0 ? seeded : [{ group: { groupId: '' } }],
    }
  },
  successMessage: 'Назначение обновлено',
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

const handleUpdate = onSubmit(
  data => update({ path: { id: permissionId }, body: data }),
  {
    onSuccess: () => navigateTo(`/dashboard/subjects/${subjectId}/settings/permissions`),
  },
)
</script>

<template>
  <div class="flex flex-col gap-4">
    <UPageHeader title="Редактирование назначения">
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

    <UAlert
      v-if="!isReady"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Назначение не найдено"
      description="Откройте назначение из списка."
    />

    <UForm
      v-else
      ref="formRef"
      :schema="EditPermissionSchema"
      :state="state"
      class="flex flex-col gap-4"
      @submit="handleUpdate"
      @error="onError"
    >
      <UAlert
        color="neutral"
        variant="soft"
        icon="i-lucide-info"
        title="Как настроить доступ"
      >
        <template #description>
          <div class="flex flex-col gap-1.5">
            <p>
              <b>Все группы предмета</b> — полные права: все группы, настройки предмета
              и выдача назначений.
            </p>
            <p class="text-muted">
              Без этой галочки доступ ограничен: каждый «доступ» — это группа (по желанию
              конкретная подгруппа) и тип занятия. «Все» означает без ограничения.
            </p>
          </div>
        </template>
      </UAlert>

      <UFormField label="Преподаватель">
        <UInput
          :model-value="targetPermission?.teacherName ?? ''"
          disabled
          class="w-full"
        />
      </UFormField>

      <UFormField>
        <USwitch v-model="state.allPermissions" label="Все группы предмета" />
        <template #help>
          Полный доступ ко всем группам, настройкам предмета и управлению назначениями.
        </template>
      </UFormField>

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

          <UFormField label="Группа" :name="`scopes.${i}.group.groupId`">
            <GroupsSubgroupSelect
              :model-value="{ groupId: s.group?.groupId || null, subgroupId: s.group?.allowedSubgroupId ?? null }"
              :groups="groups ?? []"
              :loading="groupsPending"
              @update:model-value="(v) => { s.group = { groupId: v.groupId ?? '', allowedSubgroupId: v.subgroupId ?? undefined } }"
            />
            <template #help>
              Выберите группу и, по желанию, подгруппу. «Все» в подгруппе — доступ ко всей группе.
            </template>
          </UFormField>

          <UFormField label="Тип занятия">
            <LessonTypesPermissionSelect v-model="s.allowedLessonType" :group-id="s.group?.groupId" />
            <template #help>
              Ограничить доступ лекциями или практиками. Не выбрано — оба типа.
            </template>
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
          :to="`/dashboard/subjects/${subjectId}/settings/permissions`"
          color="neutral"
          variant="ghost"
          type="button"
        >
          Отмена
        </UButton>
        <UButton
          type="submit"
          icon="i-lucide-check"
          :loading="loading"
        >
          Сохранить изменения
        </UButton>
      </div>
    </UForm>
  </div>
</template>
