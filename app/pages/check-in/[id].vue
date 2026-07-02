<script setup lang="ts">
import type { PublicCheckInRecordResponse, PublicCheckInSessionResponse, PublicStudentResponse } from '#hey-api'
import { refDebounced, useLocalStorage } from '@vueuse/core'
import { checkIn, get1, searchStudents, verifyCode as verifyCodeApi } from '#hey-api'

type PublicState = NonNullable<PublicCheckInSessionResponse['state']>

interface StoredResult {
  studentId: string
  username: string
  status: NonNullable<PublicCheckInRecordResponse['status']>
  checkedInAt?: string
}

definePageMeta({
  layout: 'landing',
})

const route = useRoute()
const sessionId = computed(() => String(route.params.id ?? ''))

const toast = useToast()
const { d } = useI18n()

const {
  data: session,
  pending,
  error,
  refresh,
} = useApi(
  { key: `public-check-in:${sessionId.value}`, watch: [sessionId] },
  () => get1({ path: { id: sessionId.value }, headers: { 'x-proxy-auth-optional': 'true' } }),
)

const state = computed<PublicState | null>(() => session.value?.state ?? null)

const stateLabel: Record<PublicState, string> = {
  OPEN: 'Опрос открыт',
  LATE_WINDOW: 'Окно для опоздавших',
  AWAITING_CONFIRMATION: 'Ожидает подтверждения преподавателем',
  CONFIRMED: 'Сессия завершена',
  CANCELLED: 'Сессия отменена',
}

const stateColor: Record<PublicState, 'success' | 'warning' | 'info' | 'neutral' | 'error'> = {
  OPEN: 'success',
  LATE_WINDOW: 'warning',
  AWAITING_CONFIRMATION: 'info',
  CONFIRMED: 'neutral',
  CANCELLED: 'error',
}

const isOpen = computed(() => state.value === 'OPEN' || state.value === 'LATE_WINDOW')

// Once the survey is confirmed or cancelled the page must not reveal any
// session details (the backend also strips them) — show a neutral stub only.
const isClosed = computed(() => state.value === 'CONFIRMED' || state.value === 'CANCELLED')

// ── Server-synced clock ───────────────────────────────────

// Offset: serverNow - clientNow at fetch time
const serverOffsetMs = ref(0)

watch(() => session.value?.serverNow, (sn) => {
  if (!sn)
    return
  const serverMs = new Date(sn).getTime()
  serverOffsetMs.value = serverMs - Date.now()
})

const now = ref(Date.now())
let tick: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  tick = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  if (tick)
    clearInterval(tick)
})

function remainingSeconds(endsAt: string | undefined): number {
  if (!endsAt)
    return 0
  const adjustedNow = now.value + serverOffsetMs.value
  return Math.max(0, Math.floor((new Date(endsAt).getTime() - adjustedNow) / 1000))
}

function formatRemaining(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

const remainingOnTime = computed(() => remainingSeconds(session.value?.onTimeEndsAt))
const remainingLate = computed(() => remainingSeconds(session.value?.lateEndsAt))

// Auto-refresh while open
let pollTimer: ReturnType<typeof setInterval> | null = null

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

watch(isOpen, (open) => {
  stopPolling()
  if (open) {
    pollTimer = setInterval(() => {
      void refresh()
    }, 10_000)
  }
}, { immediate: true })

onUnmounted(stopPolling)

// ── Step 1: код аудитории (проверяется до доступа к поиску) ─

const CODE_LENGTH = 6
// UPinInput работает с массивом сегментов; собранный код — в computed.
const codeDigits = ref<string[]>([])
const code = computed(() => codeDigits.value.join('').trim())
const codeError = ref<string | null>(null)
const verifying = ref(false)
const codeVerified = ref(false)

// ── Step 2: поиск себя по фамилии (за кодом) ───────────────

const search = ref('')
const debouncedSearch = refDebounced(search, 300)
const trimmedQuery = computed(() => debouncedSearch.value.trim())
// Сервер игнорирует запросы короче 2 символов (возвращает []).
const canSearch = computed(() =>
  codeVerified.value && isOpen.value && trimmedQuery.value.length >= 2,
)
const results = ref<PublicStudentResponse[]>([])
const searchPending = ref(false)

// ── Check-in lock ──────────────────────────────────────────

// Best-effort lock: one check-in per device per session, persisted in localStorage.
const storedResult = useLocalStorage<StoredResult | null>(
  `checkin:done:${sessionId.value}`,
  null,
  { serializer: { read: v => (v ? JSON.parse(v) : null), write: v => JSON.stringify(v) } },
)

const isLocked = computed(() => !!storedResult.value)

// ── Confirm dialog ────────────────────────────────────────

const pendingStudent = ref<PublicStudentResponse | null>(null)
const confirmOpen = ref(false)
const submitting = ref(false)

function extractMessage(e: unknown, fallback: string): string {
  const { message } = toApiError(e)
  return message && message !== 'Неизвестная ошибка' ? message : fallback
}

async function verifyCode() {
  if (!code.value) {
    codeError.value = 'Введите код аудитории'
    return
  }
  if (!isOpen.value) {
    codeError.value = 'Сессия закрыта'
    return
  }
  verifying.value = true
  codeError.value = null
  const { error } = await $api(() => verifyCodeApi({
    path: { id: sessionId.value },
    body: { code: code.value },
    headers: { 'x-proxy-auth-optional': 'true' },
  }))
  verifying.value = false

  if (error) {
    codeVerified.value = false
    codeError.value = extractMessage(error, 'Неверный код')
    return
  }
  codeVerified.value = true
}

function resetCode() {
  codeVerified.value = false
  codeDigits.value = []
  codeError.value = null
  search.value = ''
  results.value = []
}

async function runSearch() {
  if (!canSearch.value) {
    results.value = []
    return
  }
  searchPending.value = true
  // Код держим в памяти и шлём заново вместе с запросом.
  const { data, error } = await $api(() => searchStudents({
    path: { id: sessionId.value },
    body: { code: code.value, query: trimmedQuery.value },
    headers: { 'x-proxy-auth-optional': 'true' },
  }))
  searchPending.value = false

  if (error) {
    // Код мог стать неверным (например, сессия закрылась) — возвращаемся к шагу кода.
    results.value = []
    codeVerified.value = false
    codeError.value = extractMessage(error, 'Не удалось выполнить поиск')
    toast.add({ title: codeError.value, color: 'error', icon: 'i-lucide-circle-alert' })
    return
  }
  results.value = data ?? []
}

watch([trimmedQuery, canSearch], () => {
  void runSearch()
})

function openConfirm(student: PublicStudentResponse) {
  if (!student.id || isLocked.value || !isOpen.value || !codeVerified.value)
    return
  pendingStudent.value = student
  confirmOpen.value = true
}

function closeConfirm() {
  if (submitting.value)
    return
  confirmOpen.value = false
  pendingStudent.value = null
}

async function confirmCheckIn() {
  const student = pendingStudent.value
  const studentId = student?.id
  if (!studentId || !sessionId.value || !code.value)
    return

  submitting.value = true
  const { data: result, error } = await $api(() => checkIn({
    path: { id: sessionId.value },
    body: { studentId, code: code.value },
    headers: { 'x-proxy-auth-optional': 'true' },
  }))
  submitting.value = false

  if (error) {
    const message = extractMessage(error, 'Не удалось отметиться')
    // Код мог стать неверным — закрываем модалку и возвращаем к шагу кода.
    confirmOpen.value = false
    pendingStudent.value = null
    codeVerified.value = false
    codeError.value = message
    toast.add({ title: message, color: 'error', icon: 'i-lucide-circle-alert' })
    return
  }

  storedResult.value = {
    studentId,
    username: student?.username ?? '',
    status: (result?.status ?? 'PRESENT') as StoredResult['status'],
    checkedInAt: result?.checkedInAt,
  }

  toast.add({
    title: result?.status === 'LATE' ? 'Отмечено: опоздание' : 'Отмечено: вовремя',
    color: result?.status === 'LATE' ? 'warning' : 'success',
    icon: 'i-lucide-check',
  })

  confirmOpen.value = false
  pendingStudent.value = null
}

const resultStatusLabel = computed(() => {
  const s = storedResult.value?.status
  if (s === 'PRESENT')
    return 'Отмечено: вовремя'
  if (s === 'LATE')
    return 'Отмечено: опоздание'
  return 'Отмечено'
})
</script>

<template>
  <UContainer class="py-8 flex flex-col gap-6">
    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Не удалось загрузить сессию"
      :description="error.message"
    />

    <USkeleton v-else-if="pending && !session" class="h-40" />

    <UAlert
      v-else-if="isClosed"
      color="neutral"
      variant="soft"
      icon="i-lucide-lock"
      title="Сессия недоступна"
      description="Эта ссылка для отметки больше не активна."
    />

    <template v-else-if="session">
      <UPageHeader
        :title="session.lessonTopic || 'Check-in'"
        :description="state ? stateLabel[state] : ''"
      >
        <template #links>
          <UBadge
            v-if="state"
            size="lg"
            variant="subtle"
            :color="stateColor[state]"
            :label="stateLabel[state]"
          />
          <UButton
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="ghost"
            :loading="pending"
            @click="refresh()"
          />
        </template>
      </UPageHeader>

      <UCard v-if="isOpen">
        <div class="grid gap-4 sm:grid-cols-2 text-center">
          <div class="flex flex-col gap-1">
            <span class="text-muted text-xs uppercase tracking-wide">Основное окно</span>
            <span
              class="tabular-nums text-2xl font-semibold"
              :class="state === 'OPEN' ? 'text-success' : 'text-muted'"
            >
              {{ formatRemaining(remainingOnTime) }}
            </span>
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-muted text-xs uppercase tracking-wide">Окно для опоздавших</span>
            <span
              class="tabular-nums text-2xl font-semibold"
              :class="state === 'LATE_WINDOW' ? 'text-warning' : 'text-muted'"
            >
              {{ formatRemaining(remainingLate) }}
            </span>
          </div>
        </div>
      </UCard>

      <UAlert
        v-else-if="state === 'AWAITING_CONFIRMATION'"
        color="info"
        variant="soft"
        icon="i-lucide-hourglass"
        title="Опрос закрыт"
        description="Преподаватель проверяет результаты."
      />

      <UAlert
        v-if="isLocked"
        color="success"
        variant="soft"
        icon="i-lucide-check-circle"
        :title="storedResult?.username
          ? `${resultStatusLabel} — ${storedResult.username}`
          : resultStatusLabel"
      >
        <template #description>
          <span v-if="storedResult?.checkedInAt">
            Время отметки: {{ d(new Date(storedResult.checkedInAt), 'time') }}.
          </span>
          Повторно отметиться с этого устройства нельзя. Если выбрали не того студента — подойдите к преподавателю.
        </template>
      </UAlert>

      <template v-else-if="isOpen">
        <!-- Шаг 1: код аудитории -->
        <template v-if="!codeVerified">
          <UAlert
            color="neutral"
            variant="soft"
            icon="i-lucide-info"
            title="Введите код аудитории"
            description="Код показал преподаватель на экране. После подтверждения кода вы сможете найти себя в списке."
          />

          <UFormField
            label="Код аудитории"
            :error="codeError ?? undefined"
            required
          >
            <UPinInput
              v-model="codeDigits"
              :length="CODE_LENGTH"
              type="text"
              size="xl"
              autofocus
              :disabled="verifying"
              @complete="verifyCode"
            />
          </UFormField>

          <UButton
            block
            size="lg"
            icon="i-lucide-arrow-right"
            label="Подтвердить код"
            :loading="verifying"
            :disabled="code.length < CODE_LENGTH"
            @click="verifyCode"
          />
        </template>

        <!-- Шаг 2: поиск себя -->
        <template v-else>
          <UAlert
            color="success"
            variant="soft"
            icon="i-lucide-check-circle"
            title="Код принят"
          >
            <template #description>
              Код аудитории: <span class="font-semibold tracking-wider">{{ code }}</span>
            </template>
            <template #actions>
              <UButton
                color="neutral"
                variant="outline"
                icon="i-lucide-pencil"
                label="Изменить код"
                @click="resetCode"
              />
            </template>
          </UAlert>

          <UFormField label="Найдите себя">
            <UInput
              v-model="search"
              icon="i-lucide-search"
              placeholder="Введите свою фамилию..."
              size="lg"
              class="w-full"
              autofocus
            >
              <template v-if="search" #trailing>
                <UButton
                  color="neutral"
                  variant="link"
                  icon="i-lucide-x"
                  @click="search = ''"
                />
              </template>
            </UInput>
          </UFormField>

          <div class="flex flex-col gap-2">
            <p v-if="trimmedQuery.length > 0 && trimmedQuery.length < 2" class="text-muted text-xs">
              Введите хотя бы 2 символа.
            </p>

            <USkeleton v-else-if="searchPending && canSearch" class="h-16" />

            <UEmpty
              v-else-if="canSearch && results.length === 0"
              icon="i-lucide-user-x"
              title="Никого не нашли"
              description="Проверьте написание фамилии или обратитесь к преподавателю."
              variant="naked"
              class="py-8"
            />

            <UCard
              v-for="student in results"
              :key="student.id"
              :ui="{ body: 'p-3 sm:p-3' }"
              class="transition"
            >
              <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-3 min-w-0">
                  <UAvatar :alt="student.username ?? '?'" />
                  <p class="font-medium truncate">
                    {{ student.username ?? '—' }}
                  </p>
                </div>

                <UButton
                  icon="i-lucide-hand"
                  @click="openConfirm(student)"
                >
                  Это я
                </UButton>
              </div>
            </UCard>
          </div>
        </template>
      </template>
    </template>

    <UModal
      :open="confirmOpen"
      title="Подтвердите отметку"
      @update:open="(v: boolean) => { if (!v) closeConfirm() }"
    >
      <template #body>
        <div class="flex flex-col gap-4">
          <p class="text-sm">
            Отметиться как
            <span class="font-semibold">{{ pendingStudent?.username ?? '—' }}</span>?
          </p>

          <p class="text-muted text-sm">
            Код аудитории: <span class="font-semibold tracking-wider text-default">{{ code }}</span>
          </p>

          <p class="text-muted text-xs">
            После подтверждения отметить кого-то ещё с этого устройства будет нельзя.
          </p>

          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="soft"
              :disabled="submitting"
              @click="closeConfirm"
            >
              Отмена
            </UButton>
            <UButton
              icon="i-lucide-check"
              :loading="submitting"
              @click="confirmCheckIn"
            >
              Отметиться
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </UContainer>
</template>
