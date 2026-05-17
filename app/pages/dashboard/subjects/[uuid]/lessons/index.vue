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
    accessorKey: 'topic',
    header: 'Тема',
  },
  {
    accessorKey: 'type',
    header: 'Тип',
  },
  {
    accessorKey: 'subgroupIndex',
    header: 'Подгруппа',
  },
  {
    accessorKey: 'startedAt',
    header: 'Дата',
    cell: ({ row }) => formatDate(row.original.startedAt),
  },
  {
    id: 'actions',
    meta: { class: { td: 'w-10' } },
  },
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
  <div class="flex flex-col gap-8">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <p class="text-xs font-medium text-muted uppercase tracking-widest mb-1">
          Предмет
        </p>
        <h1 class="text-2xl font-semibold text-highlighted">
          Занятия
        </h1>
      </div>

      <div class="flex items-center gap-2">
        <UButton
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="ghost"
          size="sm"
          :loading="pending"
          @click="refresh()"
        />
        <UButton
          icon="i-lucide-list-plus"
          label="По количеству"
          color="neutral"
          variant="outline"
          size="sm"
          :to="`/dashboard/subjects/${subjectId}/lessons/create`"
        />
        <UButton
          icon="i-lucide-calendar-plus"
          label="По расписанию"
          size="sm"
          :to="`/dashboard/subjects/${subjectId}/lessons/schedule`"
        />
      </div>
    </div>

    <!-- Error -->
    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Ошибка загрузки"
      :description="error.message"
    />

    <!-- Table -->
    <div
      v-if="!error"
      class="border border-default rounded-xl overflow-hidden"
    >
      <UTable
        :data="rows"
        :columns="columns"
        :loading="pending && rows.length === 0"
        loading-color="primary"
        sticky
        class="max-h-[calc(100vh-16rem)]"
      >
        <!-- Тема -->
        <template #topic-cell="{ row }">
          <UTooltip
            :text="row.original.topic ?? '—'"
            :disabled="!row.original.topic"
            :delay-duration="300"
          >
            <span class="block truncate max-w-[240px] font-medium text-highlighted">
              {{ row.original.topic ?? '—' }}
            </span>
          </UTooltip>
        </template>

        <!-- Тип -->
        <template #type-cell="{ row }">
          <UBadge
            :color="row.original.type === 'LECTURE' ? 'primary' : 'secondary'"
            variant="subtle"
            size="sm"
            :label="lessonTypeLabel[row.original.type ?? ''] ?? row.original.type ?? '—'"
          />
        </template>

        <!-- Подгруппа -->
        <template #subgroupIndex-cell="{ row }">
          <span class="text-muted text-sm">
            {{ row.original.subgroupIndex === null ? 'Все' : `Подгруппа ${row.original.subgroupIndex}` }}
          </span>
        </template>

        <!-- Дата -->
        <template #startedAt-cell="{ row }">
          <span class="text-muted tabular-nums">
            {{ formatDate(row.original.startedAt) }}
          </span>
        </template>

        <!-- Действия -->
        <template #actions-cell="{ row }">
          <UDropdownMenu
            :items="rowActions(row.original)"
            :ui="{ content: 'w-36' }"
          >
            <UButton
              icon="i-lucide-ellipsis"
              color="neutral"
              variant="ghost"
              size="xs"
            />
          </UDropdownMenu>
        </template>

        <!-- Пусто -->
        <template #empty>
          <div class="flex flex-col items-center gap-4 py-16 px-6 text-center">
            <div class="p-3 rounded-full bg-elevated">
              <UIcon name="i-lucide-calendar-off" class="size-6 text-muted" />
            </div>
            <div>
              <p class="font-medium text-highlighted">
                Занятий пока нет
              </p>
              <p class="text-sm text-muted mt-1">
                Добавьте занятия по количеству или расписанию
              </p>
            </div>
            <div class="flex gap-2 mt-1">
              <UButton
                icon="i-lucide-list-plus"
                label="По количеству"
                color="neutral"
                variant="outline"
                size="sm"
                :to="`/dashboard/subjects/${subjectId}/lessons/create`"
              />
              <UButton
                icon="i-lucide-calendar-plus"
                label="По расписанию"
                size="sm"
                :to="`/dashboard/subjects/${subjectId}/lessons/schedule`"
              />
            </div>
          </div>
        </template>
      </UTable>
    </div>

    <!-- Delete modal -->
    <ConfirmModal
      :open="deleteModal"
      title="Удалить занятие"
      :description="`Занятие «${deleteTarget?.topic ?? 'без темы'}» будет удалено безвозвратно.`"
      confirm-label="Удалить"
      confirm-color="error"
      confirm-icon="i-lucide-trash-2"
      :pending="deleting"
      @close="closeDeleteModal"
      @confirm="handleDelete"
    />
  </div>
</template>
