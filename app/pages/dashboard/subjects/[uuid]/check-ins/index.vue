<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'
import type { TableColumn } from '@nuxt/ui'

type CheckInSessionResponse = components['schemas']['CheckInSessionResponse']
type CheckInState = NonNullable<CheckInSessionResponse['state']>

const route = useRoute()
const subjectId = computed(() => String(route.params.uuid ?? ''))

const { permission, pending: permissionPending } = usePermissions()
const permissionId = computed(() => permission.value?.id ?? '')

const { data, pending: sessionsPending, error, refresh } = useBackend('/api/check-in-sessions', {
  method: 'GET',
  query: computed(() => ({ permissionId: permissionId.value })),
  immediate: false,
})

watch(permissionId, (id) => {
  if (id)
    refresh()
}, { immediate: true })

const pending = computed(() => permissionPending.value || sessionsPending.value)

const rows = computed<CheckInSessionResponse[]>(() => {
  const arr = [...(data.value ?? [])]
  arr.sort((a, b) => {
    const at = a.startedAt ? new Date(a.startedAt).getTime() : 0
    const bt = b.startedAt ? new Date(b.startedAt).getTime() : 0
    return bt - at
  })
  return arr
})

const stateLabel: Record<CheckInState, string> = {
  OPEN: 'Открыта',
  LATE_WINDOW: 'Окно для опоздавших',
  AWAITING_CONFIRMATION: 'Ожидает подтверждения',
  CONFIRMED: 'Подтверждена',
  CANCELLED: 'Отменена',
}

const stateColor: Record<CheckInState, 'success' | 'warning' | 'info' | 'neutral' | 'error'> = {
  OPEN: 'success',
  LATE_WINDOW: 'warning',
  AWAITING_CONFIRMATION: 'info',
  CONFIRMED: 'neutral',
  CANCELLED: 'error',
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

function formatMinutes(sec: number | undefined): string {
  if (sec == null)
    return '—'
  const m = sec / 60
  return Number.isInteger(m) ? `${m}` : m.toFixed(1)
}

const columns: TableColumn<CheckInSessionResponse>[] = [
  { accessorKey: 'state', header: 'Состояние' },
  { accessorKey: 'startedAt', header: 'Начата' },
  { accessorKey: 'onTimeSeconds', header: 'Окно (мин)' },
  { accessorKey: 'confirmedAt', header: 'Подтверждена' },
  { id: 'actions', meta: { class: { td: 'w-10' } } },
]
</script>

<template>
  <div class="flex flex-col gap-8">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-xs font-medium text-muted uppercase tracking-widest mb-1">
          Предмет
        </p>
        <h1 class="text-2xl font-semibold text-highlighted">
          Check-in сессии
        </h1>
      </div>

      <div class="flex items-center gap-2">
        <UButton
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="ghost"
          :loading="pending"
          @click="refresh()"
        />
        <UButton
          icon="i-lucide-play"
          label="Запустить опрос"
          :to="`/dashboard/subjects/${subjectId}/check-ins/create`"
          :disabled="!permission"
        />
      </div>
    </div>

    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
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

    <div
      v-else
    >
      <UTable
        :data="rows"
        :columns="columns"
        :loading="pending && rows.length === 0"
        loading-color="primary"
        sticky
      >
        <template #state-cell="{ row }">
          <UBadge
            :color="row.original.state ? stateColor[row.original.state] : 'neutral'"
            variant="subtle"
            :label="row.original.state ? stateLabel[row.original.state] : '—'"
          />
        </template>

        <template #startedAt-cell="{ row }">
          <span class="text-muted tabular-nums">
            {{ formatDateTime(row.original.startedAt) }}
          </span>
        </template>

        <template #onTimeSeconds-cell="{ row }">
          <span class="text-muted tabular-nums">
            {{ formatMinutes(row.original.onTimeSeconds) }}
            <span v-if="row.original.lateSeconds" class="text-xs">
              + {{ formatMinutes(row.original.lateSeconds) }}
            </span>
          </span>
        </template>

        <template #confirmedAt-cell="{ row }">
          <span class="text-muted tabular-nums">
            {{ formatDateTime(row.original.confirmedAt) }}
          </span>
        </template>

        <template #actions-cell="{ row }">
          <UButton
            icon="i-lucide-arrow-right"
            color="neutral"
            variant="ghost"
            :to="`/dashboard/subjects/${subjectId}/check-ins/${row.original.id}`"
          />
        </template>

        <template #empty>
          <div class="flex flex-col items-center gap-4 py-16 px-6 text-center">
            <div class="p-3 rounded-full bg-elevated">
              <UIcon name="i-lucide-clipboard-list" class="size-6 text-muted" />
            </div>
            <div>
              <p class="font-medium text-highlighted">
                Сессий пока нет
              </p>
              <p class="text-sm text-muted mt-1">
                Запустите опрос для текущего занятия
              </p>
            </div>
            <UButton
              icon="i-lucide-play"
              label="Запустить опрос"
              :to="`/dashboard/subjects/${subjectId}/check-ins/create`"
            />
          </div>
        </template>
      </UTable>
    </div>
  </div>
</template>
