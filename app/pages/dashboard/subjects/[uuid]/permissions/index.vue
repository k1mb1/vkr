<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import type { FetchError } from 'ofetch'

type TeacherSubjectPermissionResponse = components['schemas']['TeacherSubjectPermissionResponse']

const route = useRoute()
const subjectId = computed(() => String(route.params.uuid ?? ''))

const { data, pending, error, refresh } = useBackend('/api/teacher-subject-permissions', {
  method: 'GET',
  query: { subjectId: subjectId.value },
})

const rows = computed<TeacherSubjectPermissionResponse[]>(() => data.value ?? [])

const columns: TableColumn<TeacherSubjectPermissionResponse>[] = [
  { accessorKey: 'teacherName', header: 'Преподаватель' },
  {
    accessorKey: 'groupName',
    header: 'Группа',
    cell: ({ row }) => row.original.groupName ?? '—',
  },
  {
    accessorKey: 'allowedLessonType',
    header: 'Тип занятия',
    cell: ({ row }) => {
      const type = row.original.allowedLessonType
      if (!type)
        return 'Все'
      const map: Record<string, string> = { LECTURE: 'Лекция', PRACTICE: 'Практика' }
      return map[type] ?? type
    },
  },
  {
    accessorKey: 'allowedSubgroupIndex',
    header: 'Подгруппа',
    cell: ({ row }) => {
      const index = row.original.allowedSubgroupIndex
      return index === null || index === undefined ? 'Все' : `Подгруппа ${index}`
    },
  },
  { id: 'actions', header: '' },
]

// ── Delete ────────────────────────────────────────────────

const deleteTarget = ref<TeacherSubjectPermissionResponse | null>(null)
const deleteModal = ref(false)
const deleting = ref(false)

const { $backend } = useNuxtApp()
const { toastError } = useApiError()
const toast = useToast()

function openDeleteModal(row: TeacherSubjectPermissionResponse) {
  deleteTarget.value = row
  deleteModal.value = true
}

function closeDeleteModal() {
  deleteModal.value = false
  deleteTarget.value = null
}

async function handleDelete() {
  if (!deleteTarget.value?.id)
    return

  deleting.value = true
  try {
    await $backend('/api/teacher-subject-permissions/{id}', {
      method: 'DELETE',
      path: { id: deleteTarget.value.id },
    })
    toast.add({ title: 'Назначение удалено', color: 'success', icon: 'i-lucide-check' })
    closeDeleteModal()
    await refresh()
  }
  catch (e) {
    toastError(e as FetchError)
  }
  finally {
    deleting.value = false
  }
}

function goToCreate() {
  navigateTo(`/dashboard/subjects/${subjectId.value}/permissions/create`)
}

function goToEdit(row: TeacherSubjectPermissionResponse) {
  navigateTo({
    path: `/dashboard/subjects/${subjectId.value}/permissions/${row.id}/edit`,
    state: { permission: JSON.parse(JSON.stringify(row)) },
  })
}

function rowActions(row: TeacherSubjectPermissionResponse): DropdownMenuItem[][] {
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
        color: 'error',
        onSelect: () => openDeleteModal(row),
      },
    ],
  ]
}
</script>

<template>
  <div class="flex h-full flex-col gap-6">
    <UPageHeader title="Назначения преподавателей">
      <template #links>
        <UButton
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="ghost"
          :loading="pending"
          @click="refresh()"
        />
        <UButton
          icon="i-lucide-plus"
          label="Добавить"
          @click="goToCreate"
        />
      </template>
    </UPageHeader>

    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      title="Ошибка загрузки"
      :description="error.message"
    />

    <UTable
      v-else
      :data="rows"
      :columns="columns"
      :loading="pending && rows.length === 0"
      sticky
    >
      <template #actions-cell="{ row }">
        <div class="flex justify-end">
          <UDropdownMenu
            :items="rowActions(row.original)"
            :ui="{ content: 'w-36' }"
          >
            <UButton
              icon="i-lucide-ellipsis-vertical"
              color="neutral"
              variant="ghost"
            />
          </UDropdownMenu>
        </div>
      </template>

      <template #empty>
        <UEmpty
          icon="i-lucide-shield-off"
          title="Назначения не найдены"
          description="Добавьте первое назначение с помощью кнопки выше."
          variant="naked"
          class="py-6"
        />
      </template>
    </UTable>

    <ConfirmModal
      :open="deleteModal"
      title="Удалить назначение"
      :description="`Преподаватель ${deleteTarget?.teacherName ?? ''} будет откреплён от этого предмета.`"
      confirm-label="Удалить"
      confirm-color="error"
      confirm-icon="i-lucide-trash-2"
      :pending="deleting"
      @close="closeDeleteModal"
      @confirm="handleDelete"
    />
  </div>
</template>
