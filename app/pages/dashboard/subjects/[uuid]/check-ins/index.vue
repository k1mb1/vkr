<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'
import type { TableColumn } from '@nuxt/ui'

type CheckInSessionResponse = components['schemas']['CheckInSessionResponse']
type CheckInState = NonNullable<CheckInSessionResponse['state']>

interface ScopeState {
  groupId: string
  allowedSubgroupId: string | null
}

interface FlatRow {
  _sessionId: string
  _scopeIndex: number
  state: CheckInState | undefined
  startedAt: string | undefined
  onTimeSeconds: number | undefined
  lateSeconds: number | undefined
  confirmedAt: string | undefined
  groupId: string | undefined
  groupName: string
  subgroupLabel: string
  session: CheckInSessionResponse
}

const route = useRoute()
const subjectId = computed(() => String(route.params.uuid ?? ''))

const { permission, scopes: myScopes, permissionId, pending: permissionPending } = usePermissions()

function myScopeForGroup(groupId: string) {
  return myScopes.value.find(s => s.group?.id === groupId)
}

const scopeState = reactive<ScopeState>({
  groupId: '',
  allowedSubgroupId: null,
})

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

const flatRows = computed<FlatRow[]>(() => {
  const out: FlatRow[] = []
  const sessions = [...(data.value ?? [])]
  sessions.sort((a, b) => {
    const at = a.startedAt ? new Date(a.startedAt).getTime() : 0
    const bt = b.startedAt ? new Date(b.startedAt).getTime() : 0
    return bt - at
  })

  for (const session of sessions) {
    if (!session.id)
      continue
    const audience = session.audience ?? []
    if (audience.length === 0) {
      out.push({
        _sessionId: session.id,
        _scopeIndex: 0,
        state: session.state,
        startedAt: session.startedAt,
        onTimeSeconds: session.onTimeSeconds,
        lateSeconds: session.lateSeconds,
        confirmedAt: session.confirmedAt,
        groupId: undefined,
        groupName: 'Все',
        subgroupLabel: 'Все',
        session,
      })
      continue
    }
    for (const [i, a] of audience.entries()) {
      out.push({
        _sessionId: session.id,
        _scopeIndex: i,
        state: session.state,
        startedAt: session.startedAt,
        onTimeSeconds: session.onTimeSeconds,
        lateSeconds: session.lateSeconds,
        confirmedAt: session.confirmedAt,
        groupId: a.groupId ?? undefined,
        groupName: a.groupName ?? '—',
        subgroupLabel: a.allowedSubgroupIndex != null
          ? `Подгруппа ${a.allowedSubgroupIndex}`
          : 'Все',
        session,
      })
    }
  }
  return out
})

const filteredRows = computed<FlatRow[]>(() => {
  if (!scopeState.groupId)
    return flatRows.value
  return flatRows.value.filter((r) => {
    if (r.groupName === 'Все')
      return true
    if (r.groupId !== scopeState.groupId)
      return false
    if (scopeState.allowedSubgroupId != null) {
      const scope = r.session.audience?.[r._scopeIndex]
      return scope?.allowedSubgroupId === scopeState.allowedSubgroupId
    }
    return true
  })
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

const sessionSpans = computed(() => buildRowspanMap(filteredRows.value, '_sessionId'))

const columns = computed<TableColumn<FlatRow>[]>(() => [
  withRowspan({ accessorKey: 'state', header: 'Состояние' }, sessionSpans.value),
  withRowspan({ accessorKey: 'startedAt', header: 'Начата' }, sessionSpans.value, 'align-middle text-muted text-sm'),
  withRowspan({ accessorKey: 'onTimeSeconds', header: 'Окно (мин)' }, sessionSpans.value, 'align-middle text-muted text-sm'),
  withRowspan({ accessorKey: 'confirmedAt', header: 'Подтверждена' }, sessionSpans.value, 'align-middle text-muted text-sm'),
  { accessorKey: 'groupName', header: 'Группа' },
  { accessorKey: 'subgroupLabel', header: 'Подгруппа' },
  withRowspan({ id: 'actions' }, sessionSpans.value, 'w-10 align-middle'),
])
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
      v-else-if="!permissionPending && (!permission || myScopes.length === 0)"
      color="warning"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Нет назначения"
      description="У вас нет назначения по данному предмету."
    />

    <div
      v-else
      class="flex flex-col gap-4"
    >
      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField label="Группа">
          <GroupsPermissionScopeSelect v-model="scopeState.groupId" />
        </UFormField>

        <UFormField v-if="scopeState.groupId" label="Подгруппа">
          <SubgroupsSelect
            v-model="scopeState.allowedSubgroupId"
            :group-id="scopeState.groupId"
            :allowed-subgroup-id="myScopeForGroup(scopeState.groupId)?.allowedSubgroup?.id"
          />
        </UFormField>
      </div>

      <ClientOnly>
        <UTable
          :data="filteredRows"
          :columns="columns"
          :loading="pending && filteredRows.length === 0"
          loading-color="primary"
          sticky
          class="w-full"
          :ui="{ td: 'empty:p-0' }"
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

          <template #groupName-cell="{ row }">
            <span class="font-mono font-semibold uppercase tracking-wide">
              {{ row.original.groupName }}
            </span>
          </template>

          <template #subgroupLabel-cell="{ row }">
            <UBadge
              :color="row.original.subgroupLabel === 'Все' ? 'success' : 'primary'"
              :variant="row.original.subgroupLabel === 'Все' ? 'subtle' : 'outline'"
            >
              {{ row.original.subgroupLabel }}
            </UBadge>
          </template>

          <template #actions-cell="{ row }">
            <UButton
              icon="i-lucide-arrow-right"
              color="neutral"
              variant="ghost"
              :to="`/dashboard/subjects/${subjectId}/check-ins/${row.original.session.id}`"
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
      </ClientOnly>
    </div>
  </div>
</template>
