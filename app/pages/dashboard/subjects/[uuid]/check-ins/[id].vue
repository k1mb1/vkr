<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { FetchError } from 'ofetch'
import type { components } from '#open-fetch-schemas/backend'
import { useQRCode } from '@vueuse/integrations/useQRCode'

type CheckInSessionResponse = components['schemas']['CheckInSessionResponse']
type CheckInState = NonNullable<CheckInSessionResponse['state']>
type CheckInPreviewResponse = components['schemas']['CheckInPreviewResponse']
type Row = components['schemas']['Row']
type Override = components['schemas']['Override']
type AttendanceStatus = NonNullable<Override['status']>
type ConfirmCheckInRequest = components['schemas']['ConfirmCheckInRequest']

const route = useRoute()
const subjectId = computed(() => String(route.params.uuid ?? ''))
const sessionId = computed(() => String(route.params.id ?? ''))

const { $backend } = useNuxtApp()
const { toastError } = useApiError()
const toast = useToast()
const { d } = useI18n()

const {
  data: session,
  pending: sessionPending,
  error: sessionError,
  refresh: refreshSession,
} = useBackend('/api/check-in-sessions/{id}', {
  method: 'GET',
  path: computed(() => ({ id: sessionId.value })),
})

const state = computed<CheckInState | null>(() => session.value?.state ?? null)

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

const isActive = computed(() => state.value === 'OPEN' || state.value === 'LATE_WINDOW')
const isAwaiting = computed(() => state.value === 'AWAITING_CONFIRMATION')

function formatDateTime(dt: string | undefined): string {
  if (!dt)
    return '—'
  return d(new Date(dt), 'datetimeSeconds')
}

// ── Countdown ──────────────────────────────────────────────

const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  if (timer)
    clearInterval(timer)
})

// Auto-refresh while active / awaiting
let pollTimer: ReturnType<typeof setInterval> | null = null

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

watch([isActive, isAwaiting], ([active, awaiting]) => {
  stopPolling()
  if (active || awaiting) {
    pollTimer = setInterval(() => {
      void refreshSession()
      void loadPreview({ silent: true })
    }, 5000)
  }
}, { immediate: true })

onUnmounted(stopPolling)

function remainingSeconds(endsAt: string | undefined): number {
  if (!endsAt)
    return 0
  return Math.max(0, Math.floor((new Date(endsAt).getTime() - now.value) / 1000))
}

function formatRemaining(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

const remainingOnTime = computed(() => remainingSeconds(session.value?.onTimeEndsAt))
const remainingLate = computed(() => remainingSeconds(session.value?.lateEndsAt))

// ── Public link ───────────────────────────────────────────

const publicUrl = computed(() => {
  if (!sessionId.value)
    return ''
  if (import.meta.client)
    return `${window.location.origin}/check-in/${sessionId.value}`
  return `/check-in/${sessionId.value}`
})

async function copyLink() {
  if (!publicUrl.value)
    return
  try {
    await navigator.clipboard.writeText(publicUrl.value)
    toast.add({ title: 'Ссылка скопирована', color: 'success', icon: 'i-lucide-check' })
  }
  catch {
    toast.add({ title: 'Не удалось скопировать', color: 'error' })
  }
}

// QR code (data URL)
const qrCode = useQRCode(publicUrl, {
  errorCorrectionLevel: 'M',
  margin: 1,
  width: 512,
  color: { dark: '#000000', light: '#ffffff' },
})

const qrModalOpen = ref(false)

// Web Share API
const canShare = ref(false)
onMounted(() => {
  canShare.value = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
})

async function shareLink() {
  if (!publicUrl.value)
    return
  try {
    await navigator.share({
      title: 'Отметка присутствия',
      text: 'Отметьтесь на занятии',
      url: publicUrl.value,
    })
  }
  catch (e) {
    // User cancelled — not an error
    if ((e as DOMException)?.name === 'AbortError')
      return
    toast.add({ title: 'Не удалось поделиться', color: 'error' })
  }
}

async function downloadQr() {
  if (!qrCode.value)
    return
  const a = document.createElement('a')
  a.href = qrCode.value
  a.download = `check-in-${sessionId.value}.png`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

// ── Cancel ────────────────────────────────────────────────

const cancelOpen = ref(false)
const { loading: cancelling, submit: submitCancel } = useFormSubmit()

async function handleCancel() {
  await submitCancel(
    () => $backend('/api/check-in-sessions/{id}/cancel', {
      method: 'POST',
      path: { id: sessionId.value },
    }),
    {
      successMessage: 'Сессия отменена',
      onSuccess: async () => {
        cancelOpen.value = false
        await refreshSession()
      },
    },
  )
}

// ── Preview & confirm ─────────────────────────────────────

const preview = ref<CheckInPreviewResponse | null>(null)
const previewPending = ref(false)
const previewError = ref<string | null>(null)

const overrides = reactive<Record<string, { status: AttendanceStatus, comment: string }>>({})

async function loadPreview(opts: { silent?: boolean } = {}) {
  if (!sessionId.value)
    return
  previewPending.value = true
  previewError.value = null
  try {
    const data = await $backend('/api/check-in-sessions/{id}/preview', {
      method: 'GET',
      path: { id: sessionId.value },
    })
    preview.value = data
    for (const row of data.rows ?? []) {
      if (row.studentId && !overrides[row.studentId]) {
        overrides[row.studentId] = {
          status: (row.proposedStatus ?? 'ABSENT') as AttendanceStatus,
          comment: '',
        }
      }
    }
  }
  catch (e) {
    const fe = e as FetchError
    previewError.value = fe.message
    // При фоновом опросе (например, пока сессия ещё открыта) не спамим тостами.
    if (!opts.silent)
      toastError(fe)
  }
  finally {
    previewPending.value = false
  }
}

watch([isActive, isAwaiting], ([active, awaiting]) => {
  if (active || awaiting)
    void loadPreview()
}, { immediate: true })

const STATUSES: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']

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

const statusItems = computed(() =>
  STATUSES.map(s => ({ value: s, label: statusLabel[s] })),
)

const previewRows = computed<Row[]>(() => {
  const arr = [...(preview.value?.rows ?? [])]
  arr.sort((a, b) => (a.username ?? '').localeCompare(b.username ?? '', 'ru'))
  return arr
})

// Живой список берём из preview: публичный эндпоинт ростер больше не отдаёт.
const liveStudents = previewRows

const liveStats = computed(() => {
  const total = liveStudents.value.length
  let present = 0
  let late = 0
  for (const s of liveStudents.value) {
    if (s.checkInStatus === 'PRESENT')
      present++
    else if (s.checkInStatus === 'LATE')
      late++
  }
  return { total, present, late, missing: total - present - late }
})

const liveColumns: TableColumn<Row>[] = [
  { accessorKey: 'username', header: 'Студент' },
  { accessorKey: 'checkInStatus', header: 'Статус' },
  { accessorKey: 'checkedInAt', header: 'Время отметки' },
]

const previewColumns: TableColumn<Row>[] = [
  { accessorKey: 'username', header: 'Студент' },
  { accessorKey: 'checkInStatus', header: 'Отметка' },
  { accessorKey: 'proposedStatus', header: 'Статус', meta: { class: { td: 'min-w-[180px]' } } },
  { id: 'comment', header: 'Комментарий', meta: { class: { td: 'min-w-[200px]' } } },
]

const { loading: confirming, submit: submitConfirm } = useFormSubmit()

async function handleConfirm() {
  await submitConfirm(
    () => {
      const overridesList: Override[] = []
      for (const row of preview.value?.rows ?? []) {
        if (!row.studentId)
          continue
        const ovr = overrides[row.studentId]
        if (!ovr)
          continue
        const status = ovr.status
        const comment = ovr.comment.trim()
        // Only include overrides that differ from proposed status or have a comment
        if (status !== row.proposedStatus || comment) {
          overridesList.push({
            studentId: row.studentId,
            status,
            comment: comment || undefined,
          })
        }
      }
      const body: ConfirmCheckInRequest = {
        overrides: overridesList.length ? overridesList : undefined,
      }
      return $backend('/api/check-in-sessions/{id}/confirm', {
        method: 'POST',
        path: { id: sessionId.value },
        body,
      })
    },
    {
      successMessage: 'Посещаемость подтверждена',
      onSuccess: async () => {
        await refreshSession()
        await navigateTo(`/dashboard/subjects/${subjectId.value}/attendances`)
      },
    },
  )
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <UPageHeader title="Сессия отметки присутствия">
      <template #links>
        <UButton
          :to="`/dashboard/subjects/${subjectId}/check-ins`"
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="ghost"
          label="К списку"
        />
        <UButton
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="ghost"
          :loading="sessionPending"
          @click="refreshSession()"
        />
      </template>
    </UPageHeader>

    <UAlert
      v-if="sessionError"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Ошибка загрузки"
      :description="sessionError.message"
    />

    <USkeleton v-else-if="sessionPending && !session" class="h-40" />

    <template v-else-if="session">
      <UCard>
        <template #header>
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <UBadge
                size="lg"
                :color="state ? stateColor[state] : 'neutral'"
                variant="subtle"
                :label="state ? stateLabel[state] : '—'"
              />
              <span class="text-muted text-sm">
                Начата: {{ formatDateTime(session.startedAt) }}
              </span>
            </div>

            <div class="flex items-center gap-2">
              <UButton
                v-if="isActive || isAwaiting"
                icon="i-lucide-x"
                color="error"
                variant="soft"
                label="Отменить"
                @click="cancelOpen = true"
              />
            </div>
          </div>
        </template>

        <div class="grid gap-4 sm:grid-cols-2">
          <div class="col-span-full flex flex-col gap-1">
            <span class="text-muted text-xs uppercase tracking-wide">Аудитория</span>
            <div v-if="session.audience?.length" class="flex flex-wrap gap-1">
              <UBadge
                v-for="scope in session.audience"
                :key="`${scope.groupId}-${scope.allowedSubgroupId ?? 'all'}`"
                color="neutral"
                variant="subtle"
                :label="scope.allowedSubgroupIndex
                  ? `${scope.groupName} / п.${scope.allowedSubgroupIndex}`
                  : scope.groupName ?? '—'"
              />
            </div>
            <span v-else class="text-sm text-muted">—</span>
          </div>

          <div class="flex flex-col gap-1">
            <span class="text-muted text-xs uppercase tracking-wide">Основное окно</span>
            <div class="flex items-center gap-2">
              <span class="tabular-nums font-medium">
                {{ session.onTimeSeconds ?? '—' }} с
              </span>
              <UBadge
                v-if="state === 'OPEN'"
                color="success"
                variant="soft"
                :label="`Осталось ${formatRemaining(remainingOnTime)}`"
              />
            </div>
            <span class="text-muted text-xs">
              До: {{ formatDateTime(session.onTimeEndsAt) }}
            </span>
          </div>

          <div class="flex flex-col gap-1">
            <span class="text-muted text-xs uppercase tracking-wide">Окно для опоздавших</span>
            <div class="flex items-center gap-2">
              <span class="tabular-nums font-medium">
                {{ session.lateSeconds ?? '—' }} с
              </span>
              <UBadge
                v-if="state === 'LATE_WINDOW'"
                color="warning"
                variant="soft"
                :label="`Осталось ${formatRemaining(remainingLate)}`"
              />
            </div>
            <span class="text-muted text-xs">
              До: {{ formatDateTime(session.lateEndsAt) }}
            </span>
          </div>

          <div v-if="session.confirmedAt" class="flex flex-col gap-1">
            <span class="text-muted text-xs uppercase tracking-wide">Подтверждена</span>
            <span class="tabular-nums">{{ formatDateTime(session.confirmedAt) }}</span>
          </div>

          <div v-if="session.cancelledAt" class="flex flex-col gap-1">
            <span class="text-muted text-xs uppercase tracking-wide">Отменена</span>
            <span class="tabular-nums">{{ formatDateTime(session.cancelledAt) }}</span>
          </div>
        </div>
      </UCard>

      <UCard v-if="isActive || isAwaiting">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-share-2" class="text-primary size-5" />
            <span class="font-medium">Отправить студентам</span>
          </div>
        </template>

        <div class="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div class="bg-white rounded-lg p-3 self-center shrink-0">
            <img
              v-if="qrCode"
              :src="qrCode"
              alt="QR-код"
              class="size-48 cursor-zoom-in"
              @click="qrModalOpen = true"
            >
            <USkeleton v-else class="size-48" />
          </div>

          <div class="flex flex-col gap-3 flex-1 min-w-0">
            <div
              v-if="session.code && isActive"
              class="flex flex-col items-center gap-1 rounded-lg border border-default bg-elevated/50 p-3 text-center"
            >
              <span class="text-muted text-xs uppercase tracking-wide">Код аудитории</span>
              <span class="text-4xl font-bold tracking-[0.3em] tabular-nums">
                {{ session.code }}
              </span>
              <span class="text-muted text-xs">
                Студенты вводят этот код при отметке
              </span>
            </div>

            <UInput
              :model-value="publicUrl"
              readonly
              class="w-full"
            >
              <template #trailing>
                <UButton
                  icon="i-lucide-copy"
                  color="neutral"
                  variant="link"
                  @click="copyLink"
                />
              </template>
            </UInput>

            <div class="flex flex-wrap gap-2">
              <UButton
                icon="i-lucide-copy"
                color="neutral"
                variant="outline"
                label="Копировать ссылку"
                @click="copyLink"
              />
              <UButton
                v-if="canShare"
                icon="i-lucide-share-2"
                color="neutral"
                variant="outline"
                label="Поделиться"
                @click="shareLink"
              />
              <UButton
                icon="i-lucide-maximize"
                color="neutral"
                variant="outline"
                label="Показать QR"
                @click="qrModalOpen = true"
              />
              <UButton
                icon="i-lucide-download"
                color="neutral"
                variant="outline"
                label="Скачать QR"
                :disabled="!qrCode"
                @click="downloadQr"
              />
              <UButton
                icon="i-lucide-external-link"
                color="neutral"
                variant="ghost"
                label="Открыть"
                :to="publicUrl"
                target="_blank"
              />
            </div>

            <p class="text-muted text-xs">
              Покажите QR на проекторе или поделитесь ссылкой — студенты отметятся со своих устройств без авторизации.
            </p>
          </div>
        </div>
      </UCard>

      <UModal
        v-model:open="qrModalOpen"
        title="QR для отметки присутствия"
        :ui="{ content: 'sm:max-w-2xl' }"
      >
        <template #body>
          <div class="flex flex-col items-center gap-4">
            <div class="bg-white rounded-xl p-6">
              <img
                v-if="qrCode"
                :src="qrCode"
                alt="QR-код"
                class="w-full max-w-[480px]"
              >
            </div>

            <div v-if="session.code" class="flex flex-col items-center gap-1">
              <span class="text-muted text-xs uppercase tracking-wide">Код аудитории</span>
              <span class="text-5xl font-bold tracking-[0.3em] tabular-nums">
                {{ session.code }}
              </span>
            </div>

            <p class="text-muted text-sm break-all text-center">
              {{ publicUrl }}
            </p>
            <div class="flex gap-2">
              <UButton
                icon="i-lucide-copy"
                color="neutral"
                variant="outline"
                label="Копировать ссылку"
                @click="copyLink"
              />
              <UButton
                icon="i-lucide-download"
                label="Скачать"
                :disabled="!qrCode"
                @click="downloadQr"
              />
            </div>
          </div>
        </template>
      </UModal>

      <UCard v-if="isActive">
        <template #header>
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-users" class="text-primary size-5" />
              <span class="font-medium">Текущее состояние</span>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <UBadge
                variant="soft"
                color="success"
                :label="`Вовремя: ${liveStats.present}`"
                icon="i-lucide-check"
              />
              <UBadge
                variant="soft"
                color="warning"
                :label="`Опоздали: ${liveStats.late}`"
                icon="i-lucide-clock"
              />
              <UBadge
                variant="soft"
                color="neutral"
                :label="`Не отметились: ${liveStats.missing}`"
                icon="i-lucide-minus"
              />
              <UButton
                icon="i-lucide-refresh-cw"
                color="neutral"
                variant="ghost"
                :loading="previewPending"
                @click="loadPreview()"
              />
            </div>
          </div>
        </template>

        <ClientOnly>
          <UTable
            :data="liveStudents"
            :columns="liveColumns"
            :loading="previewPending && liveStudents.length === 0"
          >
            <template #username-cell="{ row }">
              {{ row.original.username ?? '—' }}
            </template>

            <template #checkInStatus-cell="{ row }">
              <UBadge
                v-if="row.original.checkInStatus === 'PRESENT'"
                color="success"
                variant="soft"
                icon="i-lucide-check"
                label="Присутствует"
              />
              <UBadge
                v-else-if="row.original.checkInStatus === 'LATE'"
                color="warning"
                variant="soft"
                icon="i-lucide-clock"
                label="Опоздал"
              />
              <UBadge
                v-else
                color="neutral"
                variant="soft"
                label="Не отметился"
              />
            </template>

            <template #checkedInAt-cell="{ row }">
              <span>
                {{ row.original.checkedInAt ? formatDateTime(row.original.checkedInAt) : '—' }}
              </span>
            </template>

            <template #empty>
              <div class="flex flex-col items-center gap-2 py-8 text-center">
                <UIcon name="i-lucide-users" class="size-6 text-muted" />
                <p class="text-muted text-sm">
                  Нет студентов
                </p>
              </div>
            </template>
          </UTable>
        </ClientOnly>
      </UCard>

      <UCard v-if="isAwaiting">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-clipboard-check" class="text-primary size-5" />
              <span class="font-medium">Подтверждение результатов</span>
            </div>
            <UButton
              icon="i-lucide-refresh-cw"
              color="neutral"
              variant="ghost"
              :loading="previewPending"
              @click="loadPreview()"
            />
          </div>
        </template>

        <UAlert
          v-if="previewError"
          color="error"
          variant="soft"
          icon="i-lucide-circle-alert"
          title="Ошибка загрузки"
          :description="previewError"
        />

        <USkeleton v-else-if="previewPending && !preview" class="h-32" />

        <UEmpty
          v-else-if="previewRows.length === 0"
          icon="i-lucide-clipboard-x"
          title="Нет данных"
          description="Список студентов пуст."
          variant="naked"
          class="py-6"
        />

        <div v-else class="flex flex-col gap-3">
          <p class="text-muted text-sm">
            Проверьте предлагаемые статусы и при необходимости измените их перед переносом в основную посещаемость.
          </p>

          <ClientOnly>
            <UTable
              :data="previewRows"
              :columns="previewColumns"
            >
              <template #username-cell="{ row }">
                {{ row.original.username ?? '—' }}
              </template>

              <template #checkInStatus-cell="{ row }">
                <div v-if="row.original.checkInStatus" class="flex flex-col gap-1">
                  <UBadge
                    variant="soft"
                    :color="row.original.checkInStatus === 'PRESENT' ? 'success' : 'warning'"
                    :label="row.original.checkInStatus === 'PRESENT' ? 'Присутствовал' : 'Опоздал'"
                  />
                  <span class="text-muted text-xs tabular-nums">
                    {{ formatDateTime(row.original.checkedInAt) }}
                  </span>
                </div>
                <span v-else class="text-muted text-xs">Не отметился</span>
              </template>

              <template #proposedStatus-cell="{ row }">
                <USelect
                  v-if="row.original.studentId && overrides[row.original.studentId]"
                  v-model="overrides[row.original.studentId]!.status"
                  :items="statusItems"
                  class="w-full"
                />
              </template>

              <template #comment-cell="{ row }">
                <UInput
                  v-if="row.original.studentId && overrides[row.original.studentId]"
                  v-model="overrides[row.original.studentId]!.comment"
                  placeholder="—"
                  class="w-full"
                />
              </template>
            </UTable>
          </ClientOnly>

          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="soft"
              :disabled="confirming"
              :to="`/dashboard/subjects/${subjectId}/check-ins`"
            >
              К списку
            </UButton>
            <UButton
              icon="i-lucide-check"
              :loading="confirming"
              :disabled="previewRows.length === 0"
              @click="handleConfirm"
            >
              Подтвердить и перенести
            </UButton>
          </div>

          <div class="text-muted flex flex-wrap items-center gap-3 text-xs">
            <span>Цвета:</span>
            <UBadge
              v-for="s in STATUSES"
              :key="s"
              variant="soft"
              :color="statusColor[s]"
              :label="statusLabel[s]"
            />
          </div>
        </div>
      </UCard>

      <UAlert
        v-else-if="state === 'CONFIRMED'"
        color="success"
        variant="soft"
        icon="i-lucide-check-circle"
        title="Сессия подтверждена"
        description="Результаты перенесены в основную посещаемость."
      >
        <template #actions>
          <UButton
            color="success"
            variant="solid"
            icon="i-lucide-clipboard-check"
            :to="`/dashboard/subjects/${subjectId}/attendances`"
          >
            Открыть посещаемость
          </UButton>
        </template>
      </UAlert>

      <UAlert
        v-else-if="state === 'CANCELLED'"
        color="error"
        variant="soft"
        icon="i-lucide-x-circle"
        title="Сессия отменена"
        description="Результаты не были перенесены в посещаемость."
      />
    </template>

    <ConfirmModal
      :open="cancelOpen"
      title="Отменить сессию"
      description="Студенты больше не смогут отметиться. Результаты не будут перенесены в посещаемость."
      confirm-label="Отменить сессию"
      confirm-color="error"
      confirm-icon="i-lucide-x"
      :pending="cancelling"
      @close="cancelOpen = false"
      @confirm="handleCancel"
    />
  </div>
</template>
