<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { AttendanceTableLesson, AttendanceTableResponse } from '#hey-api'
import { getAttendancePolicy, getAttendanceTable } from '#hey-api'
import { useAttendanceExport } from '~/composables/useAttendanceExport'
import { groupBySection } from '~/composables/useTableSections'
import { toolbarButton } from '~/utils/toolbarButtons'

type LessonType = NonNullable<AttendanceTableLesson['type']>

const route = useRoute()
const subjectId = computed(() => String(route.params.uuid ?? ''))

const { permissionId, hasAllPermissions, scopes } = usePermissions()
const { exportLoading, downloadExcel } = useAttendanceExport()
const { sortBy, sortItems } = useStudentSort()
const { density } = useTableDensity()

const { data, pending, error, refresh } = useApi(
  { key: `attendance-table:${subjectId.value}`, immediate: false },
  () => getAttendanceTable({ query: { permissionId: permissionId.value } }),
)

useRefreshOnPermission(permissionId, refresh)

const { data: attendancePolicy } = useApi(
  { key: `attendance-policy:${subjectId.value}`, watch: [subjectId] },
  () => getAttendancePolicy({ path: { subjectId: subjectId.value } }),
)

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
  if (opts.length === 0)
    return
  const valid = new Set(opts.map(o => o.value))
  const kept = selectedSections.value.filter(v => valid.has(v))
  const next = kept.length === 0 ? opts.map(o => o.value) : kept
  if (next.length !== selectedSections.value.length
    || next.some((v, i) => v !== selectedSections.value[i])) {
    selectedSections.value = next
  }
})

const allSectionsDeselected = computed(() =>
  sectionOptions.value.length > 0 && selectedSections.value.length === 0,
)

const filteredData = computed<AttendanceTableResponse | null>(() => {
  if (!data.value)
    return null
  if (typeFilter.value === 'ALL')
    return data.value
  const lessons = (data.value.lessons ?? []).filter(l => l.type === typeFilter.value)
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

// Обновляем при возврате на вкладку, но не во время правки и не при
// несохранённых отметках — чтобы не сбить контекст редактирования.
useRefreshOnFocus(refresh, { enabled: () => !editMode.value && attendanceDirty.value === 0 })
</script>

<template>
  <div class="flex h-full flex-col gap-6">
    <UPageHeader title="Посещаемость">
      <template #links>
        <UDropdownMenu :items="exportItems" :ui="{ content: 'w-48' }">
          <UButton
            v-bind="toolbarButton.export"
            :loading="exportLoading"
            :disabled="!data"
          >
            Экспорт Excel
          </UButton>
        </UDropdownMenu>
        <AppDensityToggle />
        <UButton
          v-bind="toolbarButton.refresh"
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
      <AppHint
        id="attendances-index"
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

        <div v-if="canEdit" class="ml-auto flex items-center gap-3">
          <USwitch
            v-model="editMode"
            label="Редактирование"
          />
          <UButton
            v-show="editMode && attendanceDirty > 0"
            v-bind="toolbarButton.reset"
            label="Сбросить"
            :disabled="attendanceSaving"
            @click="resetAttendance"
          />
          <UButton
            v-show="editMode"
            v-bind="toolbarButton.save"
            :label="attendanceDirty > 0 ? `Сохранить (${attendanceDirty})` : 'Сохранить'"
            :loading="attendanceSaving"
            :disabled="attendanceDirty === 0"
            @click="saveAttendance"
          />
        </div>
      </div>

      <div class="min-h-[60vh]">
        <USkeleton v-if="pending && !data" class="h-[60vh] w-full" />

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
          :density="density"
          :editable="editMode && canEdit"
          :pending-changes="attendancePendingView"
          empty-description="Для отображения посещаемости нужны и студенты, и занятия."
          @change="onAttendanceChange"
        />
      </div>
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
