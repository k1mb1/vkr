<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { components } from '#open-fetch-schemas/backend'
import { useAttendanceExport } from '~/composables/useAttendanceExport'
import { groupBySection } from '~/composables/useTableSections'

type AttendanceTableResponse = components['schemas']['AttendanceTableResponse']
type AttendanceTableLesson = components['schemas']['AttendanceTableLesson']
type LessonType = NonNullable<AttendanceTableLesson['type']>

const route = useRoute()
const subjectId = computed(() => String(route.params.uuid ?? ''))

const { permissionId, hasAllPermissions, scopes } = usePermissions()
const { exportLoading, downloadExcel } = useAttendanceExport()
const { sortBy, sortItems } = useStudentSort()

const { data, pending, error, refresh } = useBackend('/api/attendances', {
  method: 'GET',
  query: computed(() => ({
    permissionId: permissionId.value,
    subjectId: subjectId.value,
  })),
  immediate: false,
})

useRefreshOnPermission(permissionId, refresh)

const { data: attendancePolicy } = useBackend('/api/attendance-policy/subjects/{subjectId}', {
  method: 'GET',
  path: computed(() => ({ subjectId: subjectId.value })),
})

// ── Filters ──────────────────────────────────────────────

const typeFilter = useStoredTab<'ALL' | LessonType>('attendances-type-filter', 'ALL')

const typeTabItems = [
  { label: 'Все', value: 'ALL' as const },
  { label: 'Лекции', value: 'LECTURE' as const },
  { label: 'Практики', value: 'PRACTICE' as const },
]

const sectionOptions = computed(() =>
  groupBySection(data.value?.students ?? []).map(g => ({ label: g.meta.label, value: g.meta.key })),
)

const selectedSections = ref<string[]>([])

watch(sectionOptions, (opts) => {
  const valid = new Set(opts.map(o => o.value))
  selectedSections.value = selectedSections.value.filter(v => valid.has(v))
  if (selectedSections.value.length === 0 && opts.length > 0)
    selectedSections.value = opts.map(o => o.value)
}, { immediate: true })

const allSectionsDeselected = computed(() =>
  sectionOptions.value.length > 0 && selectedSections.value.length === 0,
)

const filteredData = computed<AttendanceTableResponse | null>(() => {
  if (!data.value)
    return null
  const lessons = typeFilter.value === 'ALL'
    ? data.value.lessons
    : (data.value.lessons ?? []).filter(l => l.type === typeFilter.value)
  return { ...data.value, lessons }
})

// ── Export ───────────────────────────────────────────────

const exportItems = computed<DropdownMenuItem[]>(() => [
  {
    label: 'Все занятия',
    icon: 'i-lucide-layers',
    onSelect: () => downloadExcel(data.value, selectedSections.value, 'ALL'),
  },
  {
    label: 'Только лекции',
    icon: 'i-lucide-book-open',
    onSelect: () => downloadExcel(data.value, selectedSections.value, 'LECTURE'),
  },
  {
    label: 'Только практики',
    icon: 'i-lucide-pen-line',
    onSelect: () => downloadExcel(data.value, selectedSections.value, 'PRACTICE'),
  },
])

// ── Inline editing ───────────────────────────────────────

// Полный доступ либо хотя бы один scope — точечные права бэкенд перепроверяет
// при сохранении, поэтому видимые ячейки можно редактировать прямо здесь.
const canEdit = computed<boolean>(() => hasAllPermissions.value || scopes.value.length > 0)

const editMode = ref(false)

const {
  dirty: attendanceDirty,
  saving: attendanceSaving,
  pendingView: attendancePendingView,
  onChange: onAttendanceChange,
  reset: resetAttendance,
  save: saveAttendance,
} = useAttendanceDrafts({ onSaved: () => refresh() })

const { leaveModalOpen, confirmLeave, cancelLeave } = useUnsavedGuard(() => attendanceDirty.value > 0, resetAttendance)
</script>

<template>
  <div class="flex h-full flex-col gap-6">
    <UPageHeader title="Посещаемость">
      <template #links>
        <UDropdownMenu :items="exportItems" :ui="{ content: 'w-48' }">
          <UButton
            icon="i-lucide-file-spreadsheet"
            trailing-icon="i-lucide-chevron-down"
            color="neutral"
            variant="ghost"
            :loading="exportLoading"
            :disabled="!data"
          >
            Export Excel
          </UButton>
        </UDropdownMenu>
        <UButton
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="ghost"
          :loading="pending"
          @click="refresh()"
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

    <div v-else class="flex flex-col gap-4">
      <UAlert
        color="neutral"
        variant="soft"
        icon="i-lucide-info"
        title="Сводная посещаемость"
        description="Статусы по всем занятиям: присутствие, опоздание, отсутствие и уважительная причина. Заполняются автоматически после подтверждения отметки или вручную на странице занятия. Если включена «Политика учёта посещаемости», статусы дают баллы в оценках и итогах. Включите «Редактирование», чтобы проставлять статусы по любым занятиям прямо здесь, не переключаясь между занятиями, — затем нажмите «Сохранить»."
      />

      <div class="flex flex-wrap items-center gap-4">
        <UTabs v-model="typeFilter" :items="typeTabItems" :content="false" />
        <USelectMenu
          v-model="selectedSections"
          multiple
          value-key="value"
          :items="sectionOptions"
          placeholder="Группы"
          class="w-64"
        />
        <USelect
          v-model="sortBy"
          :items="sortItems"
          value-key="value"
          icon="i-lucide-arrow-down-up"
          class="w-44"
        />

        <div v-if="canEdit" class="flex items-center gap-3 ml-auto">
          <USwitch
            v-model="editMode"
            label="Редактирование"
          />
          <template v-if="editMode || attendanceDirty > 0">
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
        </div>
      </div>

      <USkeleton v-if="pending && !data" class="h-64 w-full" />

      <UEmpty
        v-else-if="allSectionsDeselected"
        icon="i-lucide-filter-x"
        title="Группы не выбраны"
        description="Выберите хотя бы одну группу в фильтре, чтобы увидеть таблицу."
        variant="naked"
        class="py-6"
      />

      <AttendanceSectionedTable
        v-else
        :data="filteredData"
        :pending="pending"
        :sections-filter="selectedSections"
        :attendance-policy="attendancePolicy"
        :sort-by="sortBy"
        :editable="editMode && canEdit"
        :pending-changes="attendancePendingView"
        empty-description="Для отображения посещаемости нужны и студенты, и занятия."
        @change="onAttendanceChange"
      />
    </div>

    <ConfirmModal
      :open="leaveModalOpen"
      title="Несохранённые изменения"
      :description="`У вас есть несохранённые отметки: ${attendanceDirty}. Если уйти со страницы, изменения будут потеряны.`"
      confirm-label="Уйти без сохранения"
      confirm-color="error"
      confirm-icon="i-lucide-log-out"
      cancel-label="Остаться"
      @close="cancelLeave"
      @confirm="confirmLeave"
    />
  </div>
</template>
