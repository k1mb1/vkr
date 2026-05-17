<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import type { FetchError } from 'ofetch'

type LessonResponse = components['schemas']['LessonResponse']

const route = useRoute()
const subjectId = computed(() => String(route.params.uuid ?? ''))

const { permission, pending: permissionPending } = usePermissions()
const permissionId = computed(() => permission.value?.id ?? '')

const { data, pending: lessonsPending, error, refresh } = useBackend('/api/lessons', {
  method: 'GET',
  query: computed(() => ({ permissionId: permissionId.value })),
  immediate: false,
})

watch(permissionId, (id) => {
  if (id)
    refresh()
}, { immediate: true })

const pending = computed(() => permissionPending.value || lessonsPending.value)

const rows = computed<LessonResponse[]>(() => data.value ?? [])

const lessonTypeLabel: Record<string, string> = {
  LECTURE: 'Лекция',
  PRACTICE: 'Практика',
}

function formatDate(dt: string | undefined): string {
  if (!dt)
    return '—'
  return new Intl.DateTimeFormat('ru', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dt))
}

const columns: TableColumn<LessonResponse>[] = [
  {
    accessorKey: 'type',
    header: 'Тип',
    cell: ({ row }) => lessonTypeLabel[row.original.type ?? ''] ?? row.original.type ?? '—',
  },
  {
    accessorKey: 'subgroupIndex',
    header: 'Подгруппа',
    cell: ({ row }) => row.original.subgroupIndex === null
      ? 'все'
      : `подгруппа ${row.original.subgroupIndex}`,
  },
  {
    accessorKey: 'topic',
    header: 'Тема',
    cell: ({ row }) => row.original.topic ?? '—',
  },
  {
    accessorKey: 'startedAt',
    header: 'Дата',
    cell: ({ row }) => formatDate(row.original.startedAt),
  },
  { id: 'actions', header: '' },
]

// ── Delete ────────────────────────────────────────────────

const deleteTarget = ref<LessonResponse | null>(null)
const deleteModal = ref(false)
const deleting = ref(false)

const { $backend } = useNuxtApp()
const { toastError } = useApiError()
const toast = useToast()

function goToEdit(row: LessonResponse) {
  navigateTo({
    path: `/dashboard/subjects/${subjectId.value}/lessons/${row.id}/edit`,
    state: { lesson: JSON.parse(JSON.stringify(row)) },
  })
}

function openDeleteModal(row: LessonResponse) {
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
    await $backend('/api/lessons/{id}', {
      method: 'DELETE',
      path: { id: deleteTarget.value.id },
    })
    toast.add({ title: 'Занятие удалено', color: 'success', icon: 'i-lucide-check' })
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

function rowActions(row: LessonResponse): DropdownMenuItem[][] {
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
  <div class="flex flex-col gap-6">
    <UPageHeader title="Занятия">
      <template #links>
        <UButton
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="ghost"
          :loading="pending"
          @click="refresh()"
        />
        <UButton
          icon="i-lucide-list-plus"
          label="По количеству"
          color="neutral"
          variant="outline"
          :to="`/dashboard/subjects/${subjectId}/lessons/create`"
        />
        <UButton
          icon="i-lucide-calendar-plus"
          label="По расписанию"
          :to="`/dashboard/subjects/${subjectId}/lessons/schedule`"
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
      <template #type-cell="{ row }">
        <UBadge
          variant="soft"
          :color="row.original.type === 'LECTURE' ? 'primary' : 'secondary'"
          :label="lessonTypeLabel[row.original.type ?? ''] ?? row.original.type ?? '—'"
        />
      </template>

      <template #subgroupIndex-cell="{ row }">
        <UBadge
          variant="soft"
          color="neutral"
          :label="row.original.subgroupIndex === null ? 'все' : `подгруппа ${row.original.subgroupIndex}`"
        />
      </template>

      <template #actions-cell="{ row }">
        <UDropdownMenu
          :items="rowActions(row.original)"
          :ui="{ content: 'w-36' }"
          class="flex justify-end"
        >
          <UButton
            icon="i-lucide-ellipsis-vertical"
            color="neutral"
            variant="ghost"
          />
        </UDropdownMenu>
      </template>

      <template #empty>
        <UEmpty
          icon="i-lucide-calendar-off"
          title="Занятия не найдены"
          description="По данному предмету занятий пока нет."
          variant="naked"
          class="py-6"
        />
      </template>
    </UTable>

    <ConfirmModal
      :open="deleteModal"
      title="Удалить занятие"
      :description="`Занятие «${deleteTarget?.topic ?? 'без темы'}» будет удалено.`"
      confirm-label="Удалить"
      confirm-color="error"
      confirm-icon="i-lucide-trash-2"
      :pending="deleting"
      @close="closeDeleteModal"
      @confirm="handleDelete"
    />
  </div>
</template>
