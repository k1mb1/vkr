<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import type { LessonResponse, LessonScopeResponse } from '#hey-api'
import { deleteLessonScope } from '#hey-api'

const props = defineProps<{
  lesson: LessonResponse
  subjectId: string
  canManage?: boolean
}>()

const emit = defineEmits<{
  deleted: []
}>()

const { loading: deleting, submit } = useFormSubmit()
const { d } = useI18n()

function formatDate(value: string | undefined): string {
  return value ? d(new Date(value), 'numeric') : '—'
}

const deleteModal = ref(false)
const deleteTarget = ref<LessonScopeResponse | null>(null)

function openDeleteModal(scope: LessonScopeResponse) {
  deleteTarget.value = scope
  deleteModal.value = true
}

function closeDeleteModal() {
  deleteModal.value = false
  deleteTarget.value = null
}

async function handleDelete() {
  if (!deleteTarget.value?.id)
    return
  await submit(
    () => deleteLessonScope({ path: { scopeId: deleteTarget.value!.id! } }),
    {
      successMessage: 'Проведение удалено',
      onSuccess: () => {
        closeDeleteModal()
        emit('deleted')
      },
    },
  )
}

const columns = computed<TableColumn<LessonScopeResponse>[]>(() => {
  const base: TableColumn<LessonScopeResponse>[] = [
    { accessorKey: 'allGroups', header: 'Все группы' },
    { accessorKey: 'groupName', header: 'Группа' },
    { accessorKey: 'allowedSubgroupIndex', header: 'Подгруппа' },
    { accessorKey: 'startedAt', header: 'Дата' },
  ]
  if (props.canManage)
    base.push({ id: 'actions', header: '' })
  return base
})

function scopeActions(scope: LessonScopeResponse): DropdownMenuItem[][] {
  return [
    [
      {
        label: 'Изменить',
        icon: 'i-lucide-pencil',
        onSelect: () => navigateTo({
          path: `/dashboard/subjects/${props.subjectId}/lessons/${props.lesson.id}/edit`,
          state: { lesson: JSON.parse(JSON.stringify(props.lesson)) },
        }),
      },
    ],
    [
      {
        label: 'Удалить',
        icon: 'i-lucide-trash-2',
        color: 'error' as const,
        onSelect: () => openDeleteModal(scope),
      },
    ],
  ]
}
</script>

<template>
  <UTable :data="lesson.scopes ?? []" :columns="columns">
    <template #actions-cell="{ row }">
      <UDropdownMenu :items="scopeActions(row.original)" :ui="{ content: 'w-36' }">
        <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" />
      </UDropdownMenu>
    </template>

    <template #allGroups-cell="{ getValue }">
      <UBadge
        :label="getValue() ? 'Все группы' : 'Выборочно'"
        :color="getValue() ? 'success' : 'neutral'"
        variant="soft"
      />
    </template>

    <template #groupName-cell="{ getValue }">
      {{ getValue() ?? '—' }}
    </template>

    <template #allowedSubgroupIndex-cell="{ getValue }">
      {{ getValue() != null ? `Подгруппа ${getValue()}` : '—' }}
    </template>

    <template #startedAt-cell="{ getValue }">
      {{ formatDate(getValue<string | undefined>()) }}
    </template>

    <template #empty>
      <UEmpty
        v-if="canManage"
        icon="i-lucide-calendar-x"
        title="Проведений нет"
        description="Добавьте расписание для этого занятия"
        variant="naked"
        class="py-6"
      >
        <template #actions>
          <UButton
            icon="i-lucide-calendar-plus"
            :to="`/dashboard/subjects/${subjectId}/lessons/${lesson.id}/scopes-create`"
          >
            Добавить проведение
          </UButton>
        </template>
      </UEmpty>

      <UEmpty
        v-else
        icon="i-lucide-calendar-x"
        title="Проведений нет"
        description="Расписание для этого занятия не задано"
        variant="naked"
        class="py-6"
      />
    </template>
  </UTable>

  <ConfirmModal
    :open="deleteModal"
    title="Удалить проведение"
    :description="`Проведение от ${formatDate(deleteTarget?.startedAt)} будет удалено безвозвратно.`"
    confirm-label="Удалить"
    confirm-color="error"
    confirm-icon="i-lucide-trash-2"
    :pending="deleting"
    @close="closeDeleteModal"
    @confirm="handleDelete"
  />
</template>
