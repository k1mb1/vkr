<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'

type LessonResponse = components['schemas']['LessonResponse']
type BulkUpsertAttendanceRequest = components['schemas']['BulkUpsertAttendanceRequest']
type BulkUpsertGradesRequest = components['schemas']['BulkUpsertGradesRequest']

const route = useRoute()
const subjectId = computed(() => String(route.params.uuid ?? ''))
const lessonId = computed(() => String(route.params.id ?? ''))

const { permissionId, hasAllPermissions } = usePermissions()
const { $backend } = useNuxtApp()
const toast = useToast()
const { d } = useI18n()

// ── Data ────────────────────────────────────────────────────────────────────
const { data: lesson, pending: lessonPending, error: lessonError } = useBackend('/api/lessons/{id}', {
  method: 'GET',
  path: computed(() => ({ id: lessonId.value })),
})

const { data: attData, pending: attPending, refresh: attRefresh } = useBackend('/api/attendances', {
  method: 'GET',
  query: computed(() => ({ permissionId: permissionId.value, lessonId: lessonId.value })),
  immediate: false,
})

const { data: gradesData, pending: gradesPending, refresh: gradesRefresh } = useBackend('/api/grades', {
  method: 'GET',
  query: computed(() => ({ permissionId: permissionId.value, lessonId: lessonId.value })),
  immediate: false,
})

watch(permissionId, (pid) => {
  if (pid) {
    attRefresh()
    gradesRefresh()
  }
}, { immediate: true })

function refreshAll() {
  attRefresh()
  gradesRefresh()
}

const lessonTypeLabel = (t?: LessonResponse['type']) => t === 'LECTURE' ? 'Лекция' : t === 'PRACTICE' ? 'Практика' : '—'

const scopeDates = computed<string[]>(() => {
  const dates = (lesson.value?.scopes ?? [])
    .map(s => s.startedAt)
    .filter((d): d is string => !!d)
    .sort()
  return dates.map(date => d(new Date(date), 'numeric'))
})

const totalPoints = computed(() =>
  (lesson.value?.assignments ?? []).reduce((s, a) => s + (a.maxPoints ?? 0), 0),
)

// ── Attendance drafts ───────────────────────────────────────────────────────
type UpsertAttendanceRequest = BulkUpsertAttendanceRequest['items'][number]
type AttendanceStatus = UpsertAttendanceRequest['status']

const attendanceChanges = reactive<Record<string, AttendanceStatus>>({})
const attendanceSaving = ref(false)
const attendanceDirty = computed(() => Object.keys(attendanceChanges).length)

function onAttendanceChange(payload: UpsertAttendanceRequest) {
  attendanceChanges[`${payload.studentId}|${payload.lessonScopeId}`] = payload.status
}

function resetAttendance() {
  for (const k of Object.keys(attendanceChanges))
    delete attendanceChanges[k]
}

async function saveAttendance() {
  if (attendanceDirty.value === 0 || attendanceSaving.value)
    return
  const items: UpsertAttendanceRequest[] = Object.entries(attendanceChanges).map(([key, status]) => {
    const [studentId, lessonScopeId] = key.split('|')
    return { studentId: studentId!, lessonScopeId: lessonScopeId!, status }
  })
  attendanceSaving.value = true
  try {
    const body: BulkUpsertAttendanceRequest = { items }
    await $backend('/api/attendances', { method: 'PUT', body })
    resetAttendance()
    await attRefresh()
    toast.add({
      title: 'Посещаемость сохранена',
      description: `Обновлено ячеек: ${items.length}`,
      color: 'success',
      icon: 'i-lucide-circle-check',
    })
  }
  catch (e: any) {
    toast.add({
      title: 'Не удалось сохранить',
      description: e?.data?.message ?? e?.message,
      color: 'error',
      icon: 'i-lucide-circle-alert',
    })
  }
  finally {
    attendanceSaving.value = false
  }
}

// ── Grade drafts ────────────────────────────────────────────────────────────
type UpsertGradeRequest = BulkUpsertGradesRequest['items'][number]
interface PendingGrade { score: number, comment?: string }

const gradeChanges = reactive<Record<string, PendingGrade & { studentId: string, lessonId: string, assignmentId?: string }>>({})
const gradeSaving = ref(false)
const gradeDirty = computed(() => Object.keys(gradeChanges).length)

const gradePendingView = computed<Record<string, PendingGrade>>(() => {
  const out: Record<string, PendingGrade> = {}
  for (const [k, v] of Object.entries(gradeChanges))
    out[k] = { score: v.score, comment: v.comment }
  return out
})

function onGradeChange(payload: UpsertGradeRequest) {
  const key = payload.assignmentId
    ? `${payload.studentId}:${payload.assignmentId}`
    : `${payload.studentId}:${payload.lessonId}:extra`
  gradeChanges[key] = {
    studentId: payload.studentId,
    lessonId: payload.lessonId,
    assignmentId: payload.assignmentId,
    score: payload.score,
    comment: payload.comment,
  }
}

function resetGrades() {
  for (const k of Object.keys(gradeChanges))
    delete gradeChanges[k]
}

async function saveGrades() {
  if (gradeDirty.value === 0 || gradeSaving.value)
    return
  const items: UpsertGradeRequest[] = Object.values(gradeChanges).map(v => ({
    studentId: v.studentId,
    lessonId: v.lessonId,
    score: v.score,
    ...(v.assignmentId ? { assignmentId: v.assignmentId } : {}),
    ...(v.comment ? { comment: v.comment } : {}),
  }))
  gradeSaving.value = true
  try {
    const body: BulkUpsertGradesRequest = { items }
    await $backend('/api/grades', { method: 'PUT', body })
    resetGrades()
    await gradesRefresh()
    toast.add({
      title: 'Оценки сохранены',
      description: `Обновлено ячеек: ${items.length}`,
      color: 'success',
      icon: 'i-lucide-circle-check',
    })
  }
  catch (e: any) {
    toast.add({
      title: 'Не удалось сохранить',
      description: e?.data?.message ?? e?.message,
      color: 'error',
      icon: 'i-lucide-circle-alert',
    })
  }
  finally {
    gradeSaving.value = false
  }
}

// ── Tabs ────────────────────────────────────────────────────────────────────
const activeTab = ref<'attendance' | 'grades'>('attendance')

const tabItems = computed(() => [
  {
    label: 'Посещаемость',
    value: 'attendance' as const,
    icon: 'i-lucide-clipboard-check',
    badge: attendanceDirty.value > 0 ? attendanceDirty.value : undefined,
  },
  {
    label: 'Оценки',
    value: 'grades' as const,
    icon: 'i-lucide-graduation-cap',
    badge: gradeDirty.value > 0 ? gradeDirty.value : undefined,
  },
])

// ── Leave guard (shared) ────────────────────────────────────────────────────
const hasUnsaved = computed(() => attendanceDirty.value > 0 || gradeDirty.value > 0)

const leaveModalOpen = ref(false)
const pendingLeavePath = ref<string | null>(null)
let confirmedLeave = false

onBeforeRouteLeave((to) => {
  if (confirmedLeave || !hasUnsaved.value)
    return true
  pendingLeavePath.value = to.fullPath
  leaveModalOpen.value = true
  return false
})

function confirmLeave() {
  confirmedLeave = true
  leaveModalOpen.value = false
  resetAttendance()
  resetGrades()
  const path = pendingLeavePath.value
  pendingLeavePath.value = null
  if (path)
    navigateTo(path)
}

function cancelLeave() {
  pendingLeavePath.value = null
  leaveModalOpen.value = false
}

function beforeUnloadHandler(e: BeforeUnloadEvent) {
  if (!hasUnsaved.value)
    return
  e.preventDefault()
  e.returnValue = ''
}

onMounted(() => window.addEventListener('beforeunload', beforeUnloadHandler))
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnloadHandler))
</script>

<template>
  <div class="flex h-full flex-col gap-6">
    <UPageHeader
      :title="lesson?.topic || (lesson?.orderIndex ? `Занятие №${lesson.orderIndex}` : 'Занятие')"
      :description="lesson?.subjectName ? `Предмет: ${lesson.subjectName}` : undefined"
    >
      <template #links>
        <UBadge
          v-if="lesson?.active"
          label="Активное"
          icon="i-lucide-circle-play"
          color="primary"
          variant="subtle"
        />
        <UButton
          :to="`/dashboard/subjects/${subjectId}/lessons`"
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="ghost"
          label="Назад"
        />
        <UButton
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="ghost"
          :loading="attPending || gradesPending"
          @click="refreshAll"
        />
        <UButton
          v-if="hasAllPermissions && lesson"
          icon="i-lucide-square-pen"
          color="neutral"
          variant="outline"
          label="Редактировать"
          @click="navigateTo({
            path: `/dashboard/subjects/${subjectId}/lessons/${lessonId}/edit`,
            state: { lesson: JSON.parse(JSON.stringify(lesson)) },
          })"
        />
      </template>
    </UPageHeader>

    <div class="flex flex-col gap-6">
      <UAlert
        v-if="lessonError"
        color="error"
        variant="soft"
        icon="i-lucide-circle-alert"
        title="Не удалось загрузить занятие"
        :description="lessonError.message"
      />

      <UAlert
        v-else-if="!lessonPending && !lesson"
        color="warning"
        variant="soft"
        icon="i-lucide-circle-alert"
        title="Занятие не найдено"
      />

      <template v-else>
        <UPageGrid class="lg:grid-cols-4 sm:grid-cols-2 gap-3">
          <UPageCard
            icon="i-lucide-graduation-cap"
            title="Тип"
            :description="lessonTypeLabel(lesson?.type)"
            variant="subtle"
          />

          <UPageCard title="Аудитория" icon="i-lucide-users" variant="subtle">
            <template #description>
              <div v-if="lesson?.scopes?.length" class="flex flex-col gap-1">
                <template v-if="lesson.scopes.some(s => s.allGroups)">
                  <UBadge label="Все группы" color="primary" variant="outline" class="self-start" />
                </template>
                <UBadge
                  v-for="scope in lesson.scopes.filter(s => !s.allGroups)"
                  :key="scope.id"
                  :label="scope.allowedSubgroupIndex
                    ? `${scope.groupName ?? '—'} / подгруппа ${scope.allowedSubgroupIndex}`
                    : scope.groupName ?? '—'"
                  color="neutral"
                  variant="subtle"
                  class="self-start"
                />
              </div>
              <span v-else class="text-muted text-sm">—</span>
            </template>
          </UPageCard>

          <UPageCard title="Даты проведения" icon="i-lucide-calendar" variant="subtle">
            <template #description>
              <div v-if="scopeDates.length" class="flex flex-col gap-1">
                <span
                  v-for="date in scopeDates"
                  :key="date"
                  class="text-default text-sm"
                >
                  {{ date }}
                </span>
              </div>
              <span v-else class="text-muted text-sm">—</span>
            </template>
          </UPageCard>

          <UPageCard title="Задания" icon="i-lucide-clipboard-list" variant="subtle">
            <template #description>
              <div v-if="lesson?.assignments?.length" class="flex flex-wrap items-center gap-1">
                <UTooltip
                  v-for="a in lesson.assignments"
                  :key="a.id"
                  :text="`№${a.order} · ${a.maxPoints} б · ${a.required ? 'обязательное' : 'необязательное'}`"
                >
                  <UBadge
                    :label="`№${a.order} · ${a.maxPoints}`"
                    :color="a.required ? 'primary' : 'neutral'"
                    :variant="a.required ? 'solid' : 'subtle'"
                  />
                </UTooltip>
                <span class="text-muted text-xs">Σ {{ totalPoints }}</span>
              </div>
              <span v-else class="text-muted text-sm">Нет</span>
            </template>
          </UPageCard>
        </UPageGrid>

        <div class="flex flex-col gap-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <UTabs
              v-model="activeTab"
              :items="tabItems"
              :content="false"
              class="flex-1"
            />

            <div v-if="hasAllPermissions" class="flex items-center gap-2">
              <template v-if="activeTab === 'attendance'">
                <UButton
                  v-if="attendanceDirty > 0"
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-undo-2"
                  label="Сбросить"
                  :disabled="attendanceSaving"
                  @click="resetAttendance"
                />
                <UButton
                  color="primary"
                  variant="solid"
                  icon="i-lucide-save"
                  :label="attendanceDirty > 0 ? `Сохранить (${attendanceDirty})` : 'Сохранить'"
                  :loading="attendanceSaving"
                  :disabled="attendanceDirty === 0"
                  @click="saveAttendance"
                />
              </template>
              <template v-else>
                <UButton
                  v-if="gradeDirty > 0"
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-undo-2"
                  label="Сбросить"
                  :disabled="gradeSaving"
                  @click="resetGrades"
                />
                <UButton
                  color="primary"
                  variant="solid"
                  icon="i-lucide-save"
                  :label="gradeDirty > 0 ? `Сохранить (${gradeDirty})` : 'Сохранить'"
                  :loading="gradeSaving"
                  :disabled="gradeDirty === 0"
                  @click="saveGrades"
                />
              </template>
            </div>
          </div>

          <AttendanceSectionedTable
            v-show="activeTab === 'attendance'"
            :data="attData"
            :pending="attPending"
            :editable="hasAllPermissions"
            :pending-changes="attendanceChanges"
            empty-description="Для этого занятия нет проведений или назначенных студентов."
            @change="onAttendanceChange"
          />

          <GradesSectionedTable
            v-show="activeTab === 'grades'"
            :data="gradesData"
            :pending="gradesPending"
            :lesson-id="lessonId"
            :editable="hasAllPermissions"
            :pending-changes="gradePendingView"
            empty-description="К занятию не привязаны задания или нет студентов."
            @change="onGradeChange"
          />
        </div>
      </template>
    </div>

    <ConfirmModal
      :open="leaveModalOpen"
      title="Несохранённые изменения"
      :description="`У вас есть несохранённые изменения: посещаемость — ${attendanceDirty}, оценки — ${gradeDirty}. Если уйти со страницы, изменения будут потеряны.`"
      confirm-label="Уйти без сохранения"
      confirm-color="error"
      confirm-icon="i-lucide-log-out"
      cancel-label="Остаться"
      @close="cancelLeave"
      @confirm="confirmLeave"
    />
  </div>
</template>
