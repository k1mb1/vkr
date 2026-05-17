<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'
import type { TableColumn } from '@nuxt/ui'

type AttendanceResponse = components['schemas']['AttendanceResponse']
type AttendanceStatus = NonNullable<AttendanceResponse['status']>

const route = useRoute()
const subjectId = computed(() => String(route.params.uuid ?? ''))

const { permission, pending: permissionPending } = usePermissions()
const permissionId = computed(() => permission.value?.id ?? '')

const { data, pending: attendancesPending, error, refresh } = useBackend('/api/attendances', {
  method: 'GET',
  query: computed(() => ({ permissionId: permissionId.value })),
  immediate: false,
})

watch(permissionId, (id) => {
  if (id)
    refresh()
}, { immediate: true })

const pending = computed(() => permissionPending.value || attendancesPending.value)

const rows = computed<AttendanceResponse[]>(() => data.value ?? [])

const statusLabel: Record<AttendanceStatus, string> = {
  PRESENT: 'Присутствовал',
  ABSENT: 'Отсутствовал',
  LATE: 'Опоздал',
  EXCUSED: 'Уваж. причина',
}

const statusColor: Record<AttendanceStatus, 'success' | 'error' | 'warning' | 'info'> = {
  PRESENT: 'success',
  ABSENT: 'error',
  LATE: 'warning',
  EXCUSED: 'info',
}

function formatDateTime(dt: string | undefined): string {
  if (!dt)
    return '—'
  return new Intl.DateTimeFormat('ru', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dt))
}

const columns: TableColumn<AttendanceResponse>[] = [
  {
    accessorKey: 'studentUsername',
    header: 'Студент',
    cell: ({ row }) => row.original.studentUsername ?? '—',
  },
  {
    accessorKey: 'lessonStartedAt',
    header: 'Занятие',
    cell: ({ row }) => formatDateTime(row.original.lessonStartedAt),
  },
  {
    accessorKey: 'status',
    header: 'Статус',
  },
  {
    accessorKey: 'comment',
    header: 'Комментарий',
    cell: ({ row }) => row.original.comment ?? '—',
  },
]
</script>

<template>
  <div class="flex h-full flex-col gap-6">
    <UPageHeader title="Посещаемость">
      <template #links>
        <UButton
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="ghost"
          :loading="pending"
          @click="refresh()"
        />
        <UButton
          :to="`/dashboard/subjects/${subjectId}/lessons`"
          icon="i-lucide-calendar"
          color="neutral"
          variant="outline"
          label="Занятия"
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

    <UAlert
      v-else-if="!permissionPending && !permission"
      color="warning"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Нет назначения"
      description="У вас нет назначения по данному предмету."
    />

    <UTable
      v-else
      :data="rows"
      :columns="columns"
      :loading="pending && rows.length === 0"
      sticky
    >
      <template #status-cell="{ row }">
        <UBadge
          variant="soft"
          :color="statusColor[row.original.status as AttendanceStatus] ?? 'neutral'"
          :label="statusLabel[row.original.status as AttendanceStatus] ?? row.original.status ?? '—'"
        />
      </template>

      <template #empty>
        <UEmpty
          icon="i-lucide-clipboard-x"
          title="Записей нет"
          description="По данному предмету посещаемость пока не отмечена."
          variant="naked"
          class="py-6"
        />
      </template>
    </UTable>
  </div>
</template>
