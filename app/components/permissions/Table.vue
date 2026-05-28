<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import type { Cell } from '@tanstack/vue-table'
import type { components } from '#open-fetch-schemas/backend'

type TeacherSubjectPermissionResponse = components['schemas']['TeacherSubjectPermissionResponse']

interface FlatRow {
  _permId: string
  _permData: TeacherSubjectPermissionResponse
  teacherName: string
  allPermissions: boolean
  groupName: string
  allowedSubgroup: string
  allowedLessonType: string
}

const props = defineProps<{
  data: TeacherSubjectPermissionResponse[]
  loading?: boolean
  canManage?: boolean
  currentPermissionId?: string
  subjectId?: string
}>()

const emit = defineEmits<{
  deleted: []
}>()

const { $backend } = useNuxtApp()
const { loading: deleting, submit } = useFormSubmit()

const deleteModal = ref(false)
const deleteTarget = ref<FlatRow | null>(null)

function openDeleteModal(row: FlatRow) {
  deleteTarget.value = row
  deleteModal.value = true
}

function closeDeleteModal() {
  deleteModal.value = false
  deleteTarget.value = null
}

async function handleDelete() {
  if (!deleteTarget.value?._permId)
    return

  await submit(
    () => $backend('/api/teacher-subject-permissions/{id}', {
      method: 'DELETE',
      path: { id: deleteTarget.value!._permId },
    }),
    {
      successMessage: 'Назначение удалено',
      onSuccess: () => {
        closeDeleteModal()
        emit('deleted')
      },
    },
  )
}

function goToEdit(row: FlatRow) {
  navigateTo({
    path: `/dashboard/subjects/${props.subjectId}/settings/permissions/${row._permId}/edit`,
    state: { permission: JSON.parse(JSON.stringify(row._permData)) },
  })
}

function rowActions(row: FlatRow): DropdownMenuItem[][] {
  return [
    [
      {
        label: 'Изменить',
        icon: 'i-lucide-pencil',
        onSelect: () => goToEdit(row),
      },
    ],
    [
      {
        label: 'Удалить',
        icon: 'i-lucide-trash-2',
        color: 'error' as const,
        onSelect: () => openDeleteModal(row),
      },
    ],
  ]
}

const LESSON_TYPE_LABELS: Record<string, string> = {
  LECTURE: 'Лекция',
  PRACTICE: 'Практика',
}

function toRows(perm: TeacherSubjectPermissionResponse): FlatRow[] {
  if (!perm.id)
    return []
  const base = {
    _permId: perm.id,
    _permData: perm,
    teacherName: perm.teacherName ?? '—',
    allPermissions: !!perm.allPermissions,
  }
  const scopes = perm.scopes ?? []
  if (!scopes.length) {
    return [{ ...base, groupName: 'Все', allowedSubgroup: 'Все', allowedLessonType: 'Все' }]
  }
  return scopes.map(s => ({
    ...base,
    groupName: s.group?.name ?? 'Все',
    allowedSubgroup: s.allowedSubgroup != null ? `Подгруппа ${s.allowedSubgroup.index}` : 'Все',
    allowedLessonType: s.allowedLessonType != null
      ? (LESSON_TYPE_LABELS[s.allowedLessonType] ?? s.allowedLessonType)
      : 'Все',
  }))
}

const rows = computed<FlatRow[]>(() => props.data.flatMap(toRows))
const permSpans = computed(() => buildRowspanMap(rows.value, '_permId'))

function groupColspan(cell: Cell<FlatRow, unknown>) {
  if (cell.row.original.allPermissions)
    return '3'
  if (cell.row.original.groupName === 'Все')
    return '2'
  return '1'
}

const columns = computed<TableColumn<FlatRow>[]>(() => {
  const base: TableColumn<FlatRow>[] = [
    withRowspan({ accessorKey: 'teacherName', header: 'Учитель' }, permSpans.value, 'align-middle font-medium'),
    withRowspan({ accessorKey: 'allPermissions', header: 'Права' }, permSpans.value, 'align-middle'),
    {
      accessorKey: 'groupName',
      header: 'Группа',
      meta: { colspan: { td: groupColspan } },
    },
    {
      accessorKey: 'allowedSubgroup',
      header: 'Подгруппа',
      meta: {
        class: {
          td: (cell: Cell<FlatRow, unknown>) =>
            cell.row.original.allPermissions || cell.row.original.groupName === 'Все' ? 'hidden' : '',
        },
      },
    },
    {
      accessorKey: 'allowedLessonType',
      header: 'Тип занятия',
      meta: {
        class: {
          td: (cell: Cell<FlatRow, unknown>) =>
            cell.row.original.allPermissions ? 'hidden' : '',
        },
      },
    },
  ]

  if (props.canManage) {
    base.push(withRowspan({ id: 'actions' }, permSpans.value, 'w-10 align-middle'))
  }

  return base
})
</script>

<template>
  <ClientOnly>
    <UTable
      :data="rows"
      :columns="columns"
      :loading="loading"
      loading-color="primary"
      loading-animation="carousel"
      :ui="{ td: 'empty:p-0' }"
    >
      <template #teacherName-cell="{ row }">
        <span class="font-medium">{{ row.original.teacherName }}</span>
      </template>

      <template #allPermissions-cell="{ row }">
        <UBadge :color="row.original.allPermissions ? 'success' : 'neutral'" variant="subtle">
          {{ row.original.allPermissions ? 'Полные' : 'Ограниченные' }}
        </UBadge>
      </template>

      <template #groupName-cell="{ row }">
        <UBadge
          v-if="row.original.allPermissions || row.original.groupName === 'Все'"
          color="success"
          variant="subtle"
        >
          Все
        </UBadge>
        <span v-else class="font-mono font-semibold uppercase tracking-wide">
          {{ row.original.groupName }}
        </span>
      </template>

      <template #allowedSubgroup-cell="{ row }">
        <UBadge
          :color="row.original.allowedSubgroup === 'Все' ? 'success' : 'primary'"
          :variant="row.original.allowedSubgroup === 'Все' ? 'subtle' : 'outline'"
        >
          {{ row.original.allowedSubgroup }}
        </UBadge>
      </template>

      <template #allowedLessonType-cell="{ row }">
        <UBadge :color="row.original.allowedLessonType === 'Все' ? 'success' : 'info'" variant="subtle">
          {{ row.original.allowedLessonType }}
        </UBadge>
      </template>

      <template #actions-cell="{ row }">
        <UDropdownMenu
          v-if="row.original._permId !== currentPermissionId"
          :items="rowActions(row.original)"
          :ui="{ content: 'w-36' }"
        >
          <UButton
            icon="i-lucide-ellipsis-vertical"
            color="neutral"
            variant="ghost"
          />
        </UDropdownMenu>
      </template>

      <template #empty>
        <UEmpty icon="i-lucide-shield-off" title="Нет разрешений" variant="naked" class="py-6" />
      </template>
    </UTable>

    <ConfirmModal
      :open="deleteModal"
      title="Удалить назначение"
      :description="`Назначение преподавателя «${deleteTarget?.teacherName ?? ''}» будет удалено безвозвратно.`"
      confirm-label="Удалить"
      confirm-color="error"
      confirm-icon="i-lucide-trash-2"
      :pending="deleting"
      @close="closeDeleteModal"
      @confirm="handleDelete"
    />
  </ClientOnly>
</template>
