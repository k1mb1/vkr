<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import type { Cell } from '@tanstack/vue-table'
import type { FetchError } from 'ofetch'

type TeacherSubjectPermissionResponse = components['schemas']['TeacherSubjectPermissionResponse']

interface FlatRow {
  _permId: string
  _scopeIndex: number
  _totalScopes: number
  teacherName: string
  allPermissions: boolean
  groupName: string
  subgroups: string
  allowedSubgroup: string
  allowedLessonType: string
  permission: TeacherSubjectPermissionResponse
}

const route = useRoute()
const subjectId = computed(() => String(route.params.uuid ?? ''))

const { permission: myPermission } = usePermissions()
const canManage = computed(() => myPermission.value?.allPermissions ?? false)

function canManageRow(row: FlatRow) {
  return canManage.value && row.permission.teacherId !== myPermission.value?.teacherId
}

const { data, pending, error, refresh } = useBackend('/api/teacher-subject-permissions', {
  method: 'GET',
  query: { subjectId: subjectId.value },
})

const LESSON_TYPE_MAP: Record<string, string> = {
  LECTURE: 'Лекция',
  PRACTICE: 'Практика',
}

const rows = computed<FlatRow[]>(() => {
  const out: FlatRow[] = []
  for (const perm of data.value ?? []) {
    if (!perm.id)
      continue
    const scopes = perm.scopes ?? []
    if (scopes.length === 0) {
      out.push({
        _permId: perm.id,
        _scopeIndex: 0,
        _totalScopes: 1,
        teacherName: perm.teacherName ?? '—',
        allPermissions: !!perm.allPermissions,
        groupName: '—',
        subgroups: 'без подгрупп',
        allowedSubgroup: '—',
        allowedLessonType: '—',
        permission: perm,
      })
      continue
    }
    for (const [i, s] of scopes.entries()) {
      out.push({
        _permId: perm.id,
        _scopeIndex: i,
        _totalScopes: scopes.length,
        teacherName: perm.teacherName ?? '—',
        allPermissions: !!perm.allPermissions,
        groupName: s.group?.name ?? '—',
        subgroups:
          s.group?.subgroups?.length
            ? s.group.subgroups.map(sg => `Подгруппа ${sg.index}`).join(', ')
            : 'без подгрупп',
        allowedSubgroup:
          s.allowedSubgroup != null
            ? `Подгруппа ${s.allowedSubgroup.index}`
            : 'Все',
        allowedLessonType:
          s.allowedLessonType != null
            ? (LESSON_TYPE_MAP[s.allowedLessonType] ?? s.allowedLessonType)
            : 'Все',
        permission: perm,
      })
    }
  }
  return out
})

function makeRowspanMeta(extraClass = '') {
  return {
    rowspan: {
      td: (cell: Cell<FlatRow, unknown>) => {
        const row = cell.row.original
        return row._scopeIndex === 0 ? String(row._totalScopes) : '0'
      },
    },
    class: {
      td: (cell: Cell<FlatRow, unknown>) =>
        cell.row.original._scopeIndex !== 0
          ? 'hidden'
          : `align-middle ${extraClass}`.trim(),
    },
  }
}

const columns: TableColumn<FlatRow>[] = [
  {
    accessorKey: 'teacherName',
    header: 'Преподаватель',
    enablePinning: true,
    meta: makeRowspanMeta('font-medium'),
  },
  {
    accessorKey: 'allPermissions',
    header: 'Все права',
    meta: makeRowspanMeta(),
  },
  {
    accessorKey: 'groupName',
    header: 'Группа',
  },
  {
    accessorKey: 'subgroups',
    header: 'Подгруппы',
  },
  {
    accessorKey: 'allowedSubgroup',
    header: 'Разр. подгруппа',
  },
  {
    accessorKey: 'allowedLessonType',
    header: 'Тип занятия',
  },
  {
    id: 'actions',
    meta: {
      rowspan: makeRowspanMeta().rowspan,
      class: {
        td: (cell: Cell<FlatRow, unknown>) => {
          if (cell.row.original._scopeIndex !== 0)
            return 'hidden'
          return 'w-10 align-middle'
        },
      },
    },
  },
]

// ── Delete ────────────────────────────────────────────────

const deleteTarget = ref<TeacherSubjectPermissionResponse | null>(null)
const deleteModal = ref(false)
const deleting = ref(false)

const { $backend } = useNuxtApp()
const { toastError } = useApiError()
const toast = useToast()

function openDeleteModal(perm: TeacherSubjectPermissionResponse) {
  deleteTarget.value = perm
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

function goToEdit(perm: TeacherSubjectPermissionResponse) {
  navigateTo({
    path: `/dashboard/subjects/${subjectId.value}/permissions/${perm.id}/edit`,
    state: { permission: JSON.parse(JSON.stringify(perm)) },
  })
}

function rowActions(row: FlatRow): DropdownMenuItem[][] {
  return [
    [
      {
        label: 'Изменить',
        icon: 'i-lucide-pencil',
        onSelect: () => goToEdit(row.permission),
      },
    ],
    [
      {
        label: 'Удалить',
        icon: 'i-lucide-trash-2',
        color: 'error',
        onSelect: () => openDeleteModal(row.permission),
      },
    ],
  ]
}
</script>

<template>
  <div class="flex flex-col gap-6">
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
          v-if="canManage"
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

    <ClientOnly v-else>
      <UTable
        :data="rows"
        :columns="columns"
        :loading="pending && rows.length === 0"
        sticky
        :column-pinning="{ left: ['teacherName'] }"
        class="w-full"
        :ui="{ td: 'empty:p-0' }"
      >
        <!-- Все права -->
        <template #allPermissions-cell="{ row }">
          <UBadge
            :color="row.original.allPermissions ? 'success' : 'neutral'"
            variant="subtle"
          >
            {{ row.original.allPermissions ? 'Полные' : 'Ограниченные' }}
          </UBadge>
        </template>

        <!-- Группа -->
        <template #groupName-cell="{ row }">
          <span class="font-mono font-semibold uppercase tracking-wide">
            {{ row.original.groupName }}
          </span>
        </template>

        <!-- Разрешённая подгруппа -->
        <template #allowedSubgroup-cell="{ row }">
          <UBadge
            :color="row.original.allowedSubgroup === 'Все' ? 'success' : 'primary'"
            :variant="row.original.allowedSubgroup === 'Все' ? 'subtle' : 'outline'"
          >
            {{ row.original.allowedSubgroup }}
          </UBadge>
        </template>

        <!-- Тип занятия -->
        <template #allowedLessonType-cell="{ row }">
          <UBadge
            :color="row.original.allowedLessonType === 'Все' ? 'success' : 'info'"
            variant="subtle"
          >
            {{ row.original.allowedLessonType }}
          </UBadge>
        </template>

        <!-- Действия -->
        <template #actions-cell="{ row }">
          <UDropdownMenu
            v-if="canManageRow(row.original)"
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
            icon="i-lucide-shield-off"
            title="Назначения не найдены"
            description="Добавьте первое назначение с помощью кнопки выше."
            variant="naked"
            class="py-6"
          />
        </template>
      </UTable>
    </ClientOnly>

    <div class="flex items-center gap-4 text-sm text-muted">
      <div class="flex items-center gap-1.5">
        <span class="size-2 rounded-full bg-success-500" />
        Полные права — доступ ко всем группам и типам занятий
      </div>
      <div class="flex items-center gap-1.5">
        <span class="size-2 rounded-full bg-neutral-400" />
        Ограниченные — только указанная подгруппа / тип занятия
      </div>
    </div>

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
