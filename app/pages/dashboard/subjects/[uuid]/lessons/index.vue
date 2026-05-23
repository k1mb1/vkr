<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'

type LessonResponse = components['schemas']['LessonResponse']

interface FlatRow {
  _lessonId: string
  topic: string
  type: string
  startedAt: string
  groupName: string
  subgroupLabel: string
  lesson: LessonResponse
}

const route = useRoute()
const subjectId = computed(() => String(route.params.uuid ?? ''))

const { permissionId, pending: permissionPending } = usePermissions()

const { data, pending: lessonsPending, error, refresh } = useBackend('/api/lessons', {
  method: 'GET',
  query: computed(() => ({ permissionId: permissionId.value })),
  immediate: false,
})

watch(permissionId, (pid) => {
  if (pid)
    refresh()
}, { immediate: true })

const pending = computed(() => permissionPending.value || lessonsPending.value)

function formatDate(dt: string | undefined): string {
  if (!dt)
    return '—'
  return new Intl.DateTimeFormat('ru', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dt))
}

const rows = computed<FlatRow[]>(() => {
  const out: FlatRow[] = []
  for (const lesson of data.value ?? []) {
    if (!lesson.id)
      continue
    const scopes = lesson.scopes ?? []
    if (scopes.length === 0) {
      out.push({
        _lessonId: lesson.id,
        topic: lesson.topic ?? '—',
        type: lesson.type ?? '—',
        startedAt: formatDate(lesson.startedAt),
        groupName: 'Все',
        subgroupLabel: 'Все',
        lesson,
      })
      continue
    }
    for (const s of scopes) {
      out.push({
        _lessonId: lesson.id,
        topic: lesson.topic ?? '—',
        type: lesson.type ?? '—',
        startedAt: formatDate(lesson.startedAt),
        groupName: s.groupName ?? '—',
        subgroupLabel: s.allowedSubgroupIndex != null
          ? `Подгруппа ${s.allowedSubgroupIndex}`
          : 'Все',
        lesson,
      })
    }
  }
  return out
})

const lessonSpans = computed(() => buildRowspanMap(rows.value, '_lessonId'))

const columns = computed<TableColumn<FlatRow>[]>(() => [
  withRowspan({ accessorKey: 'topic', header: 'Тема' }, lessonSpans.value, 'align-middle font-medium'),
  withRowspan({ accessorKey: 'type', header: 'Тип' }, lessonSpans.value),
  withRowspan({ accessorKey: 'startedAt', header: 'Дата' }, lessonSpans.value, 'align-middle text-muted text-sm'),
  { accessorKey: 'groupName', header: 'Группа' },
  { accessorKey: 'subgroupLabel', header: 'Подгруппа' },
  withRowspan({ id: 'assignments', header: 'Задания' }, lessonSpans.value, 'align-middle text-center'),
  withRowspan({ id: 'actions' }, lessonSpans.value, 'w-10 align-middle'),
])

// ── Delete ────────────────────────────────────────────────

const deleteTarget = ref<LessonResponse | null>(null)
const deleteModal = ref(false)

const { $backend } = useNuxtApp()
const { loading: deleting, submit } = useFormSubmit()

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

  await submit(
    () => $backend('/api/lessons/{id}', {
      method: 'DELETE',
      path: { id: deleteTarget.value!.id! },
    }),
    {
      successMessage: 'Занятие удалено',
      onSuccess: async () => {
        closeDeleteModal()
        await refresh()
      },
    },
  )
}

function rowActions(row: FlatRow): DropdownMenuItem[][] {
  return [
    [
      {
        label: 'Изменить',
        icon: 'i-lucide-pencil',
        onSelect: () => goToEdit(row.lesson),
      },
    ],
    [
      {
        label: 'Удалить',
        icon: 'i-lucide-trash-2',
        color: 'error',
        onSelect: () => openDeleteModal(row.lesson),
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
      icon="i-lucide-circle-alert"
      title="Ошибка загрузки"
      :description="error.message"
    />

    <ClientOnly v-else>
      <UTable
        :data="rows"
        :columns="columns"
        :loading="pending && rows.length === 0"
        sticky
        class="w-full"
        :ui="{ td: 'empty:p-0' }"
      >
        <!-- Тип -->
        <template #type-cell="{ row }">
          <UBadge
            :color="row.original.type === 'LECTURE' ? 'primary' : 'secondary'"
            variant="subtle"
          >
            {{ row.original.type === 'LECTURE' ? 'Лекция' : 'Практика' }}
          </UBadge>
        </template>

        <!-- Группа -->
        <template #groupName-cell="{ row }">
          <span class="font-mono font-semibold uppercase tracking-wide">
            {{ row.original.groupName }}
          </span>
        </template>

        <!-- Подгруппа -->
        <template #subgroupLabel-cell="{ row }">
          <UBadge
            :color="row.original.subgroupLabel === 'Все' ? 'success' : 'primary'"
            :variant="row.original.subgroupLabel === 'Все' ? 'subtle' : 'outline'"
          >
            {{ row.original.subgroupLabel }}
          </UBadge>
        </template>

        <!-- Задания -->
        <template #assignments-cell="{ row }">
          <UButton
            :to="`/dashboard/subjects/${subjectId}/lessons/${row.original._lessonId}/grades`"
            icon="i-lucide-clipboard-pen"
            color="neutral"
            variant="outline"
            size="xs"
            label="Задания"
          />
        </template>

        <!-- Действия -->
        <template #actions-cell="{ row }">
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
        </template>

        <template #empty>
          <UEmpty
            icon="i-lucide-calendar-off"
            title="Занятий пока нет"
            description="Добавьте занятия по количеству или расписанию"
            variant="naked"
            class="py-6"
          />
        </template>
      </UTable>
    </ClientOnly>

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
