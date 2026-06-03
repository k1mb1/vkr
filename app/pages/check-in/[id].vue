<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'
import { useLocalStorage } from '@vueuse/core'

type PublicCheckInSessionResponse = components['schemas']['PublicCheckInSessionResponse']
type Student = components['schemas']['Student']
type PublicState = NonNullable<PublicCheckInSessionResponse['state']>

definePageMeta({
  layout: 'landing',
})

const route = useRoute()
const sessionId = computed(() => String(route.params.id ?? ''))

const { $backend } = useNuxtApp()
const toast = useToast()
const { submit } = useFormSubmit()
const { d } = useI18n()

const {
  data: session,
  pending,
  error,
  refresh,
} = useBackend('/api/check-in-sessions/public/{id}', {
  method: 'GET',
  path: computed(() => ({ id: sessionId.value })),
  headers: { 'x-proxy-auth-optional': 'true' },
})

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

// ── Student selection & search ────────────────────────────

const search = ref('')

const students = computed<Student[]>(() => {
  const arr = [...(session.value?.students ?? [])]
  arr.sort((a, b) => (a.username ?? '').localeCompare(b.username ?? '', 'ru'))
  return arr
})

const filteredStudents = computed<Student[]>(() => {
  const q = search.value.trim().toLowerCase()
  if (!q)
    return students.value
  return students.value.filter(s => (s.username ?? '').toLowerCase().includes(q))
})

// ── Check-in action ───────────────────────────────────────

const checkingInId = ref<string | null>(null)

// Best-effort lock: one check-in per device per session, persisted in localStorage
const lockedStudentId = useLocalStorage<string | null>(
  `checkin:done:${sessionId.value}`,
  null,
)

const lockedStudent = computed<Student | null>(() => {
  if (!lockedStudentId.value)
    return null
  return students.value.find(s => s.id === lockedStudentId.value) ?? null
})

const isLocked = computed(() => !!lockedStudentId.value)

async function handleCheckIn(student: Student) {
  const studentId = student.id
  if (!studentId || !sessionId.value)
    return
  if (student.checkedInStatus)
    return
  if (isLocked.value)
    return

  checkingInId.value = studentId
  await submit(
    () => $backend('/api/check-in-sessions/public/{id}/check-in', {
      method: 'POST',
      path: { id: sessionId.value },
      body: { studentId },
      headers: { 'x-proxy-auth-optional': 'true' },
    }),
    {
      onSuccess: async (result) => {
        lockedStudentId.value = studentId
        toast.add({
          title: result.status === 'LATE' ? 'Отмечено: опоздание' : 'Отмечено: вовремя',
          color: result.status === 'LATE' ? 'warning' : 'success',
          icon: 'i-lucide-check',
        })
        await refresh()
      },
    },
  )
  checkingInId.value = null
}

// ── Confirm dialog ────────────────────────────────────────

const pendingStudent = ref<Student | null>(null)
const confirmOpen = ref(false)

function openConfirm(student: Student) {
  if (!student.id || isLocked.value || student.checkedInStatus)
    return
  pendingStudent.value = student
  confirmOpen.value = true
}

function closeConfirm() {
  if (checkingInId.value)
    return
  confirmOpen.value = false
  pendingStudent.value = null
}

async function confirmCheckIn() {
  if (!pendingStudent.value)
    return
  const student = pendingStudent.value
  await handleCheckIn(student)
  if (lockedStudentId.value === student.id) {
    confirmOpen.value = false
    pendingStudent.value = null
  }
}

function studentStatusLabel(s: Student): string | null {
  if (s.checkedInStatus === 'PRESENT')
    return 'Присутствует'
  if (s.checkedInStatus === 'LATE')
    return 'Опоздал'
  return null
}
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
        v-else-if="state === 'CONFIRMED'"
        color="success"
        variant="soft"
        icon="i-lucide-check-circle"
        title="Сессия завершена"
        description="Посещаемость подтверждена."
      />

      <UAlert
        v-else-if="state === 'CANCELLED'"
        color="error"
        variant="soft"
        icon="i-lucide-x-circle"
        title="Сессия отменена"
        description="Преподаватель отменил эту сессию."
      />

      <UAlert
        v-if="isLocked"
        color="success"
        variant="soft"
        icon="i-lucide-check-circle"
        :title="lockedStudent?.username
          ? `С этого устройства отметился: ${lockedStudent.username}`
          : 'С этого устройства отметка уже сделана'"
        description="Повторно отметиться с этого устройства нельзя. Если выбрали не того студента — подойдите к преподавателю."
      />

      <UInput
        v-if="isOpen && !isLocked"
        v-model="search"
        icon="i-lucide-search"
        placeholder="Найти себя..."
        size="lg"
        class="w-full"
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

      <p v-if="isOpen && !isLocked" class="text-muted text-xs">
        Отметиться можно только один раз с устройства.
      </p>

      <div class="flex flex-col gap-2">
        <UEmpty
          v-if="filteredStudents.length === 0"
          icon="i-lucide-users"
          title="Студенты не найдены"
          :description="search ? 'Попробуйте изменить запрос.' : 'Список пуст.'"
          variant="naked"
          class="py-8"
        />

        <UCard
          v-for="student in filteredStudents"
          :key="student.id"
          :ui="{
            body: 'p-3 sm:p-3',
          }"
          class="transition"
          :class="lockedStudentId === student.id ? 'ring-2 ring-primary' : ''"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <UAvatar
                :alt="student.username ?? '?'"
              />
              <div class="min-w-0">
                <p class="font-medium truncate">
                  {{ student.username ?? '—' }}
                </p>
                <p v-if="studentStatusLabel(student)" class="text-muted text-xs">
                  {{ studentStatusLabel(student) }}
                  · {{ student.checkedInAt ? d(new Date(student.checkedInAt), 'time') : '' }}
                </p>
              </div>
            </div>

            <UBadge
              v-if="student.checkedInStatus === 'PRESENT'"
              color="success"
              variant="soft"
              icon="i-lucide-check"
              label="Отмечен"
            />
            <UBadge
              v-else-if="student.checkedInStatus === 'LATE'"
              color="warning"
              variant="soft"
              icon="i-lucide-clock"
              label="Опоздал"
            />
            <UButton
              v-else-if="isOpen && !isLocked"
              icon="i-lucide-hand"
              :loading="checkingInId === student.id"
              :disabled="checkingInId !== null"
              @click="openConfirm(student)"
            >
              Я здесь
            </UButton>
            <UBadge
              v-else
              color="neutral"
              variant="soft"
              label="—"
            />
          </div>
        </UCard>
      </div>
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
          <p class="text-muted text-xs">
            После подтверждения отметить кого-то ещё с этого устройства будет нельзя.
          </p>

          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="soft"
              :disabled="checkingInId !== null"
              @click="closeConfirm"
            >
              Отмена
            </UButton>
            <UButton
              icon="i-lucide-check"
              :loading="checkingInId !== null"
              :disabled="checkingInId !== null"
              @click="confirmCheckIn"
            >
              Я здесь
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </UContainer>
</template>
