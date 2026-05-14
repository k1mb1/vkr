<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import type { FetchError } from 'ofetch'

type SubjectTeachingRowResponse = components['schemas']['SubjectTeachingRowResponse']

const route = useRoute()
const subjectId = computed(() => String(route.params.uuid ?? ''))

const { data, pending, error, refresh } = useBackend('/api/subjects/{id}/teaching-rows', {
  method: 'GET',
  path: { id: subjectId },
})

const rows = computed<SubjectTeachingRowResponse[]>(() => data.value ?? [])

const columns: TableColumn<SubjectTeachingRowResponse>[] = [
  { accessorKey: 'teacherName', header: 'Преподаватель' },
  {
    accessorKey: 'lessonTypeScope',
    header: 'Тип занятия',
    cell: ({ row }) => {
      const scope = row.original.lessonTypeScope
      if (!scope)
        return 'Все'
      const map: Record<string, string> = { LECTURE: 'Лекция', PRACTICE: 'Практика' }
      return map[scope] ?? scope
    },
  },
  {
    accessorKey: 'subgroupIndex',
    header: 'Подгруппа',
    cell: ({ row }) => {
      const index = row.original.subgroupIndex
      return index === null || index === undefined ? 'Все' : `Подгруппа ${(index ?? 0) + 1}`
    },
  },
  { id: 'actions', header: '' },
]

// ── Delete ────────────────────────────────────────────────

const deleteTarget = ref<SubjectTeachingRowResponse | null>(null)
const deleteModal = ref(false)
const deleting = ref(false)

const { $backend } = useNuxtApp()
const { toastError } = useApiError()
const toast = useToast()

function openDeleteModal(row: SubjectTeachingRowResponse) {
  deleteTarget.value = row
  deleteModal.value = true
}

function closeDeleteModal() {
  deleteModal.value = false
  deleteTarget.value = null
}

async function handleDelete() {
  if (!deleteTarget.value?.assignmentId)
    return

  deleting.value = true
  try {
    await $backend('/api/subject-assignments/{id}', {
      method: 'DELETE',
      path: { id: deleteTarget.value.assignmentId },
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

const router = useRouter()
const teachingCreateState = useTeachingCreateState()
const teachingEditState = useTeachingEditState()

function goToCreate() {
  const firstRow = rows.value[0]
  if (firstRow) {
    teachingCreateState.value = {
      offeringId: firstRow.offeringId,
      groupId: firstRow.groupId,
      existingTeacherIds: rows.value.map(r => r.teacherId).filter((id): id is string => !!id),
    }
  }
  router.push(`/dashboard/subjects/${subjectId.value}/teaching/create`)
}

function goToEdit(row: SubjectTeachingRowResponse) {
  teachingEditState.value = row
  router.push(`/dashboard/subjects/${subjectId.value}/teaching/${row.assignmentId}/edit`)
}

function rowActions(row: SubjectTeachingRowResponse): DropdownMenuItem[][] {
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
    <UPageHeader
      title="Назначения"
      :description="rows[0]?.groupName ? `Группа: ${rows[0].groupName}` : undefined"
    >
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
          icon="i-lucide-book-open"
          title="Назначения не найдены"
          description="Для этого предмета пока нет назначений."
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
