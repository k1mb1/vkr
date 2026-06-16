<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'

type LessonResponse = components['schemas']['LessonResponse']

const route = useRoute()
const subjectId = computed(() => String(route.params.uuid ?? ''))
const lessonId = computed(() => String(route.params.id ?? ''))

const { permissionId, hasAllPermissions, scopes } = usePermissions()
const { d } = useI18n()

// ── Data ────────────────────────────────────────────────────────────────────
const { data: lesson, pending: lessonPending, error: lessonError } = useBackend('/api/lessons/{id}', {
  method: 'GET',
  path: computed(() => ({ id: lessonId.value })),
})

const { data: results, pending: resultsPending, refresh: resultsRefresh } = useBackend('/api/results', {
  method: 'GET',
  query: computed(() => ({ permissionId: permissionId.value, lessonId: lessonId.value })),
  immediate: false,
})

const attData = computed(() => results.value?.attendance ?? null)
const gradesData = computed(() => results.value?.grading ?? null)

useRefreshOnPermission(permissionId, resultsRefresh)

function refreshAll() {
  resultsRefresh()
}

const lessonTypeLabel = (t?: LessonResponse['type']) => t === 'LECTURE' ? 'Лекция' : t === 'PRACTICE' ? 'Практика' : '—'

// Полный доступ либо хотя бы один scope, разрешающий тип этого занятия.
// Фильтрация по группе/подгруппе уже выполнена бэкендом для текущего permissionId,
// а сохранение он проверяет повторно, поэтому scoped-преподавателю можно
// редактировать видимые ему ячейки.
const canEdit = computed<boolean>(() => {
  if (hasAllPermissions.value)
    return true
  const type = lesson.value?.type
  return scopes.value.some(s => !s.allowedLessonType || s.allowedLessonType === type)
})

const totalPoints = computed(() =>
  (lesson.value?.assignments ?? []).reduce((s, a) => s + (a.maxPoints ?? 0), 0),
)

// ── Attendance drafts ───────────────────────────────────────────────────────
const {
  changes: attendanceChanges,
  saving: attendanceSaving,
  dirty: attendanceDirty,
  onChange: onAttendanceChange,
  reset: resetAttendance,
  save: saveAttendance,
} = useAttendanceDrafts({ onSaved: () => resultsRefresh() })

// ── Grade drafts ────────────────────────────────────────────────────────────
const {
  dirty: gradeDirty,
  saving: gradeSaving,
  pendingView: gradePendingView,
  onChange: onGradeChange,
  reset: resetGrades,
  save: saveGrades,
} = useGradeDrafts({ onSaved: () => resultsRefresh() })

// ── Tabs ────────────────────────────────────────────────────────────────────
const activeTab = useStoredTab<'attendance' | 'grades'>('lesson-detail-tab', 'attendance')

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

const { leaveModalOpen, confirmLeave, cancelLeave } = useUnsavedGuard(hasUnsaved, () => {
  resetAttendance()
  resetGrades()
})
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
          :loading="resultsPending"
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
        <UPageGrid class="lg:grid-cols-3 sm:grid-cols-2 gap-3">
          <UPageCard
            icon="i-lucide-graduation-cap"
            title="Тип"
            :description="lessonTypeLabel(lesson?.type)"
            variant="subtle"
          />

          <UPageCard title="Аудитория и даты" icon="i-lucide-users" variant="subtle">
            <template #description>
              <div v-if="lesson?.scopes?.length" class="flex flex-col gap-1.5">
                <div
                  v-for="scope in lesson.scopes"
                  :key="scope.id"
                  class="flex items-center justify-between gap-2"
                >
                  <UBadge
                    :label="scope.allGroups
                      ? 'Все группы'
                      : scope.allowedSubgroupIndex
                        ? `${scope.groupName ?? '—'} / подгруппа ${scope.allowedSubgroupIndex}`
                        : scope.groupName ?? '—'"
                    :color="scope.allGroups ? 'primary' : 'neutral'"
                    :variant="scope.allGroups ? 'outline' : 'subtle'"
                    class="self-start"
                  />
                  <span class="text-muted text-sm whitespace-nowrap">
                    {{ scope.startedAt ? d(new Date(scope.startedAt), 'numeric') : '—' }}
                  </span>
                </div>
              </div>
              <div v-else class="flex flex-col items-start gap-2">
                <span class="text-warning text-sm">Проведение не назначено.</span>
                <UButton
                  v-if="hasAllPermissions"
                  color="primary"
                  variant="subtle"
                  icon="i-lucide-calendar-plus"
                  label="Назначить проведение"
                  @click="navigateTo(`/dashboard/subjects/${subjectId}/lessons/${lessonId}/scopes-create`)"
                />
              </div>
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
              <div v-else class="flex flex-col items-start gap-2">
                <span class="text-warning text-sm">Задания не назначены — добавьте хотя бы одно задание.</span>
                <UButton
                  v-if="hasAllPermissions && lesson"
                  color="primary"
                  variant="subtle"
                  icon="i-lucide-clipboard-list"
                  label="Добавить задания"
                  @click="navigateTo({
                    path: `/dashboard/subjects/${subjectId}/lessons/${lessonId}/assignments-create`,
                    state: { lesson: JSON.parse(JSON.stringify(lesson)) },
                  })"
                />
              </div>
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

            <div v-if="canEdit" class="flex items-center gap-2">
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
            v-if="activeTab === 'attendance'"
            :data="attData"
            :pending="resultsPending"
            :editable="canEdit"
            :pending-changes="attendanceChanges"
            empty-description="Для этого занятия нет проведений или назначенных студентов."
            @change="onAttendanceChange"
          />

          <GradesSectionedTable
            v-else
            :data="gradesData"
            :pending="resultsPending"
            :lesson-id="lessonId"
            :editable="canEdit"
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
