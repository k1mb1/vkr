<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { components } from '#open-fetch-schemas/backend'
import type { SectionKey } from '~/composables/useTableSections'
import { h, resolveComponent } from 'vue'
import { useGridCellNav } from '~/composables/useGridCellNav'
import { groupBySection, scopeVisibleForSection } from '~/composables/useTableSections'

type AttendanceTableResponse = components['schemas']['AttendanceTableResponse']
type AttendanceTableStudent = components['schemas']['AttendanceTableStudent']
type AttendanceTableLesson = components['schemas']['AttendanceTableLesson']
type AttendanceCellResponse = components['schemas']['AttendanceCellResponse']
type AttendanceStatus = NonNullable<AttendanceCellResponse['status']>
type UpsertAttendanceRequest = components['schemas']['UpsertAttendanceRequest']
type AttendancePolicyResponse = components['schemas']['AttendancePolicyResponse']

const props = withDefaults(defineProps<{
  data: AttendanceTableResponse | null | undefined
  pending?: boolean
  sectionsFilter?: string[]
  showLegend?: boolean
  emptyDescription?: string
  editable?: boolean
  pendingChanges?: Record<string, AttendanceStatus>
  tableMaxHeight?: string
  attendancePolicy?: AttendancePolicyResponse | null
}>(), {
  pending: false,
  showLegend: true,
  emptyDescription: 'Нет проведений или назначенных студентов.',
  editable: false,
  pendingChanges: () => ({}),
  tableMaxHeight: 'calc(100vh - 18rem)',
  attendancePolicy: null,
})

const emit = defineEmits<{
  change: [payload: UpsertAttendanceRequest]
}>()

const policyEnabled = computed(() => !!props.attendancePolicy?.enabled)

const UBadge = resolveComponent('UBadge')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UButton = resolveComponent('UButton')

const { onKeydown } = useGridCellNav()

const tableUi = {
  thead: 'bg-elevated/60',
  tfoot: 'bg-elevated/60 border-t border-default',
  tr: 'group hover:bg-elevated/50 transition-colors',
  th: 'px-3 py-3 text-sm text-highlighted text-left font-semibold border-r border-default last:border-r-0 [&:has([role=checkbox])]:pe-0',
  td: 'p-3 text-sm text-muted whitespace-nowrap border-r border-default last:border-r-0 [&:has([role=checkbox])]:pe-0',
} as const

const STATUSES: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']

const statusLabel: Record<AttendanceStatus, string> = {
  PRESENT: 'Присутствовал',
  ABSENT: 'Отсутствовал',
  LATE: 'Опоздал',
  EXCUSED: 'Уваж. причина',
}

const statusShort: Record<AttendanceStatus, string> = {
  PRESENT: 'П',
  ABSENT: 'Н',
  LATE: 'О',
  EXCUSED: 'У',
}

const statusColor: Record<AttendanceStatus, 'success' | 'error' | 'warning' | 'info'> = {
  PRESENT: 'success',
  ABSENT: 'error',
  LATE: 'warning',
  EXCUSED: 'info',
}

const statusTextClass: Record<AttendanceStatus, string> = {
  PRESENT: 'text-success',
  ABSENT: 'text-error',
  LATE: 'text-warning',
  EXCUSED: 'text-info',
}

const statusIcon: Record<AttendanceStatus, string> = {
  PRESENT: 'i-lucide-circle-check',
  ABSENT: 'i-lucide-circle-x',
  LATE: 'i-lucide-clock-alert',
  EXCUSED: 'i-lucide-info',
}

const lessonTypeLabel: Record<NonNullable<AttendanceTableLesson['type']>, string> = {
  LECTURE: 'Лекция',
  PRACTICE: 'Практика',
}

// ─── data ─────────────────────────────────────────────────────────────────────

const students = computed<AttendanceTableStudent[]>(() => props.data?.students ?? [])

const lessons = computed<AttendanceTableLesson[]>(() =>
  [...(props.data?.lessons ?? [])].sort((a, b) => {
    const at = a.startedAt ? new Date(a.startedAt).getTime() : 0
    const bt = b.startedAt ? new Date(b.startedAt).getTime() : 0
    return at - bt
  }),
)

const cellIndex = computed(() => {
  const map = new Map<string, AttendanceCellResponse>()
  for (const c of props.data?.attendances ?? []) {
    if (c.studentId && c.lessonScopeId)
      map.set(`${c.studentId}|${c.lessonScopeId}`, c)
  }
  return map
})

// ─── formatters ───────────────────────────────────────────────────────────────

function formatScopeDate(scope: AttendanceTableLesson): string {
  if (!scope.startedAt)
    return '—'
  return new Intl.DateTimeFormat('ru', { day: '2-digit', month: 'short' }).format(new Date(scope.startedAt))
}

function formatLessonType(scope: AttendanceTableLesson): string {
  const type = scope.type ? lessonTypeLabel[scope.type] : '—'
  return scope.orderIndex ? `${type} №${scope.orderIndex}` : type
}

// ─── column builders ──────────────────────────────────────────────────────────

function isAttended(status: AttendanceStatus | undefined): boolean {
  return status === 'PRESENT' || status === 'LATE' || status === 'EXCUSED'
}

function countPresentForScope(
  scope: AttendanceTableLesson,
  students: AttendanceTableStudent[],
  cellIndex: Map<string, AttendanceCellResponse>,
): number {
  const scopeId = scope.id
  if (!scopeId)
    return 0
  let n = 0
  for (const s of students) {
    if (!s.id)
      continue
    const key = `${s.id}|${scopeId}`
    const effective = props.pendingChanges[key] ?? cellIndex.get(key)?.status
    if (isAttended(effective))
      n++
  }
  return n
}

function countStatusForStudent(
  student: AttendanceTableStudent,
  scopes: AttendanceTableLesson[],
  cellIndex: Map<string, AttendanceCellResponse>,
  status: AttendanceStatus,
): number {
  const studentId = student.id
  if (!studentId)
    return 0
  let n = 0
  for (const sc of scopes) {
    if (!sc.id)
      continue
    const key = `${studentId}|${sc.id}`
    const effective = props.pendingChanges[key] ?? cellIndex.get(key)?.status
    if (effective === status)
      n++
  }
  return n
}

function buildStatusTotalColumn(
  status: AttendanceStatus,
  sectionScopes: AttendanceTableLesson[],
  sectionStudents: AttendanceTableStudent[],
  cellIndex: Map<string, AttendanceCellResponse>,
): TableColumn<AttendanceTableStudent> {
  return {
    id: `student-total-${status.toLowerCase()}`,
    header: () =>
      h('span', {
        class: `font-semibold ${statusTextClass[status]}`,
        title: statusLabel[status],
      }, statusShort[status]),
    cell: ({ row }) => {
      const n = countStatusForStudent(row.original, sectionScopes, cellIndex, status)
      return h(
        'span',
        { class: n > 0 ? 'tabular-nums font-semibold text-default' : 'tabular-nums text-muted/50' },
        String(n),
      )
    },
    footer: () => {
      let total = 0
      for (const s of sectionStudents)
        total += countStatusForStudent(s, sectionScopes, cellIndex, status)
      return h('span', { class: 'tabular-nums font-bold text-default' }, String(total))
    },
    meta: { class: { th: 'min-w-[56px] text-center', td: 'min-w-[56px] text-center' } },
  }
}

function attendanceScoreForStudent(
  student: AttendanceTableStudent,
  scopes: AttendanceTableLesson[],
  cellIndex: Map<string, AttendanceCellResponse>,
): number {
  const policy = props.attendancePolicy
  if (!policy?.enabled)
    return 0
  const present = countStatusForStudent(student, scopes, cellIndex, 'PRESENT')
  const late = countStatusForStudent(student, scopes, cellIndex, 'LATE')
  const absent = countStatusForStudent(student, scopes, cellIndex, 'ABSENT')
  const excused = countStatusForStudent(student, scopes, cellIndex, 'EXCUSED')
  const score = present * (policy.pointsPresent ?? 0)
    + late * (policy.pointsLate ?? 0)
    + absent * (policy.pointsAbsent ?? 0)
    + excused * (policy.pointsExcused ?? 0)
  return Math.round(score * 10) / 10
}

function buildScoreColumn(
  sectionScopes: AttendanceTableLesson[],
  sectionStudents: AttendanceTableStudent[],
  cellIndex: Map<string, AttendanceCellResponse>,
): TableColumn<AttendanceTableStudent> {
  return {
    id: 'student-att-score',
    header: () => h('span', { class: 'font-semibold text-highlighted', title: 'Балл за посещаемость' }, 'Балл'),
    cell: ({ row }) => {
      const v = attendanceScoreForStudent(row.original, sectionScopes, cellIndex)
      return h('span', { class: v !== 0 ? 'tabular-nums font-semibold text-default' : 'tabular-nums text-muted/50' }, String(v))
    },
    footer: () => {
      let total = 0
      for (const s of sectionStudents)
        total += attendanceScoreForStudent(s, sectionScopes, cellIndex)
      return h('span', { class: 'tabular-nums font-bold text-default' }, String(Math.round(total * 10) / 10))
    },
    meta: { class: { th: 'min-w-[72px] text-center', td: 'min-w-[72px] text-center' } },
  }
}

function bulkSetScopeStatus(
  scope: AttendanceTableLesson,
  sectionStudents: AttendanceTableStudent[],
  status: AttendanceStatus,
) {
  const scopeId = scope.id
  if (!scopeId)
    return
  for (const s of sectionStudents) {
    if (!s.id)
      continue
    const key = `${s.id}|${scopeId}`
    const effective = props.pendingChanges[key] ?? cellIndex.value.get(key)?.status
    if (effective === status)
      continue
    emit('change', { studentId: s.id, lessonScopeId: scopeId, status })
  }
}

function buildScopeColumn(
  scope: AttendanceTableLesson,
  cellIndex: Map<string, AttendanceCellResponse>,
  sectionStudents: AttendanceTableStudent[],
): TableColumn<AttendanceTableStudent> {
  const bulkItems = STATUSES.map(s => ({
    label: `Всем: ${statusLabel[s]}`,
    icon: statusIcon[s],
    onSelect: () => bulkSetScopeStatus(scope, sectionStudents, s),
  }))

  return {
    id: scope.id!,
    header: () =>
      h('div', { class: 'flex flex-col items-center gap-1 py-1' }, [
        // Тип занятия + метка активного
        h('div', { class: 'flex items-center gap-1' }, [
          h('span', { class: 'text-sm font-semibold text-highlighted' }, formatLessonType(scope)),
          scope.active
            ? h('span', {
                class: 'i-lucide-circle-play w-3.5 h-3.5 text-primary shrink-0',
                title: 'Активное занятие — точка отсчёта штрафа',
              })
            : null,
        ]),
        // Дата
        h('span', { class: 'text-xs text-muted tabular-nums' }, formatScopeDate(scope)),
        // Тема
        scope.topic
          ? h(
              'span',
              {
                class: 'line-clamp-2 max-w-[160px] text-center text-[11px] text-muted leading-snug',
                title: scope.topic,
              },
              scope.topic,
            )
          : null,
        // Массовое проставление статуса всему столбцу
        props.editable
          ? h(
              UDropdownMenu,
              { items: bulkItems, arrow: true, popper: { placement: 'bottom' } },
              {
                default: () => h(UButton, {
                  variant: 'ghost',
                  color: 'neutral',
                  size: 'xs',
                  trailingIcon: 'i-lucide-chevron-down',
                  label: 'Всем',
                  title: 'Отметить статус всей группе',
                }),
              },
            )
          : null,
      ]),
    cell: ({ row }) => {
      const studentId = row.original.id!
      const scopeId = scope.id!
      const key = `${studentId}|${scopeId}`
      const cell = cellIndex.get(key)
      const pendingStatus = props.pendingChanges[key]
      const effective = pendingStatus ?? cell?.status
      const isDirty = pendingStatus != null && pendingStatus !== cell?.status

      const renderBadge = () => {
        if (!effective) {
          return h('span', { class: 'text-muted/50 text-xs select-none' }, '·')
        }
        return h(UBadge, {
          variant: isDirty ? 'solid' : 'soft',
          color: statusColor[effective],
          label: statusShort[effective],
          leadingIcon: statusIcon[effective],
          title: statusLabel[effective] + (isDirty ? ' · не сохранено' : ''),
          class: 'tabular-nums font-semibold',
        })
      }

      if (!props.editable)
        return renderBadge()

      const items = STATUSES.map(s => ({
        label: statusLabel[s],
        icon: statusIcon[s],
        type: 'checkbox' as const,
        checked: effective === s,
        onSelect: (e: Event) => {
          e.preventDefault()
          if (effective === s)
            return
          emit('change', { studentId, lessonScopeId: scopeId, status: s })
        },
      }))

      return h(
        UDropdownMenu,
        { items, arrow: true, popper: { placement: 'bottom' } },
        {
          default: () => h(UButton, {
            'variant': 'ghost',
            'color': 'neutral',
            'size': 'xs',
            'square': !effective,
            'data-cell-nav': 'true',
            'class': [
              'min-h-[28px] min-w-[40px] justify-center',
              isDirty ? 'ring-1 ring-primary/60 ring-offset-1 ring-offset-default rounded' : '',
            ],
          }, () => renderBadge()),
        },
      )
    },
    footer: () => {
      const present = countPresentForScope(scope, sectionStudents, cellIndex)
      const total = sectionStudents.filter(s => !!s.id).length
      const pct = total > 0 ? Math.round((present / total) * 100) : 0
      const pctColor = pct >= 80 ? 'text-success' : pct >= 50 ? 'text-warning' : 'text-error'
      return h('div', { class: 'flex flex-col items-center leading-tight', title: 'Присутствует / всего' }, [
        h('span', { class: 'tabular-nums' }, [
          h('span', { class: 'font-semibold text-default' }, String(present)),
          h('span', { class: 'text-muted/70' }, `/${total}`),
        ]),
        total > 0 ? h('span', { class: `text-[10px] font-medium tabular-nums ${pctColor}` }, `${pct}%`) : null,
      ])
    },
    meta: { class: { th: `min-w-[120px] text-center${scope.active ? ' bg-primary/5' : ''}`, td: 'min-w-[120px] text-center p-1' } },
  }
}

// ─── sections ─────────────────────────────────────────────────────────────────

interface AttSection extends SectionKey {
  students: AttendanceTableStudent[]
  columns: TableColumn<AttendanceTableStudent>[]
  filledCells: number
  totalCells: number
}

function countFilledCells(
  scopes: AttendanceTableLesson[],
  sectionStudents: AttendanceTableStudent[],
): { filled: number, total: number } {
  let filled = 0
  let total = 0
  for (const s of sectionStudents) {
    if (!s.id)
      continue
    for (const sc of scopes) {
      if (!sc.id)
        continue
      total++
      const key = `${s.id}|${sc.id}`
      const effective = props.pendingChanges[key] ?? cellIndex.value.get(key)?.status
      if (effective)
        filled++
    }
  }
  return { filled, total }
}

const sections = computed<AttSection[]>(() => {
  const grouped = groupBySection(students.value)
  const visible = props.sectionsFilter
    ? grouped.filter(g => props.sectionsFilter!.includes(g.meta.key))
    : grouped

  return visible.map(({ meta, items }) => {
    const sectionScopes = lessons.value.filter(sc => scopeVisibleForSection(sc, meta))

    const sortedStudents = items.sort((a, b) =>
      (a.username ?? '').localeCompare(b.username ?? '', 'ru'),
    )

    const cols: TableColumn<AttendanceTableStudent>[] = [
      {
        accessorKey: 'username',
        header: 'Студент',
        footer: () => h('span', { class: 'font-semibold text-default' }, 'Итого по группе'),
        meta: {
          class: {
            th: 'min-w-[220px] sticky left-0 z-10 bg-default',
            td: 'min-w-[220px] sticky left-0 z-10 bg-default group-hover:bg-elevated/50 transition-colors',
          },
        },
      },
    ]

    for (const scope of sectionScopes) {
      if (!scope.id)
        continue
      cols.push(buildScopeColumn(scope, cellIndex.value, sortedStudents))
    }

    for (const status of STATUSES)
      cols.push(buildStatusTotalColumn(status, sectionScopes, sortedStudents, cellIndex.value))

    if (policyEnabled.value)
      cols.push(buildScoreColumn(sectionScopes, sortedStudents, cellIndex.value))

    const { filled, total } = countFilledCells(sectionScopes, sortedStudents)

    return {
      ...meta,
      students: sortedStudents,
      columns: cols,
      filledCells: filled,
      totalCells: total,
    }
  })
})

const isEmpty = computed(() => sections.value.length === 0)
const hasAnyLessons = computed(() => lessons.value.length > 0)

const fullscreenSectionKey = ref<string | null>(null)
const fullscreenSection = computed(() =>
  sections.value.find(s => s.key === fullscreenSectionKey.value) ?? null,
)
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Legend -->
    <div v-if="showLegend" class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
      <span v-for="s in STATUSES" :key="s" class="flex items-center gap-1">
        <span class="font-semibold" :class="statusTextClass[s]">{{ statusShort[s] }}</span>
        <span>— {{ statusLabel[s] }}</span>
      </span>
      <span v-if="editable" class="flex items-center gap-1 ml-auto">
        <UKbd value="←" />
        <UKbd value="↑" />
        <UKbd value="↓" />
        <UKbd value="→" />
        — навигация по ячейкам
      </span>
    </div>

    <!-- Empty state -->
    <UEmpty
      v-if="!pending && isEmpty"
      icon="i-lucide-clipboard-x"
      title="Нет данных"
      :description="emptyDescription"
      variant="naked"
      class="py-6"
    />

    <!-- Sections -->
    <template v-else>
      <section
        v-for="section in sections"
        :key="section.key"
        class="flex flex-col gap-2"
      >
        <div class="flex items-center gap-2">
          <h3 class="text-sm font-semibold text-default">
            {{ section.label }}
          </h3>
          <span class="text-xs text-muted">{{ section.students.length }}</span>
          <span
            v-if="section.totalCells > 0"
            class="text-xs text-muted tabular-nums"
            :title="`Отмечено ${section.filledCells} из ${section.totalCells}`"
          >
            отмечено {{ section.filledCells }}/{{ section.totalCells }}
          </span>
          <UButton
            v-if="section.columns.length > 1"
            icon="i-lucide-maximize-2"
            color="neutral"
            variant="ghost"
            size="xs"
            title="На весь экран"
            class="ml-auto"
            @click="fullscreenSectionKey = section.key"
          />
        </div>

        <UAlert
          v-if="section.columns.length <= 1"
          color="neutral"
          variant="soft"
          icon="i-lucide-info"
          :title="hasAnyLessons ? 'Нет занятий по выбранному фильтру' : 'Для этой группы пока нет занятий'"
        />

        <UTable
          v-else
          :data="section.students"
          :columns="section.columns"
          :loading="pending && section.students.length === 0"
          loading-color="primary"
          loading-animation="carousel"
          sticky
          :style="{ maxHeight: props.tableMaxHeight }"
          class="rounded-lg border border-default"
          :ui="tableUi"
          @keydown.capture="onKeydown"
        >
          <template #username-cell="{ row }">
            <span
              :title="(row.original as AttendanceTableStudent).username ?? ''"
              class="line-clamp-1 font-medium text-highlighted"
            >
              {{ (row.original as AttendanceTableStudent).username ?? '—' }}
            </span>
          </template>
        </UTable>
      </section>
    </template>

    <UModal
      :open="fullscreenSection !== null"
      fullscreen
      :title="fullscreenSection?.label ?? ''"
      @update:open="(v) => { if (!v) fullscreenSectionKey = null }"
    >
      <template #body>
        <UTable
          v-if="fullscreenSection"
          :data="fullscreenSection.students"
          :columns="fullscreenSection.columns"
          :loading="pending && fullscreenSection.students.length === 0"
          loading-color="primary"
          loading-animation="carousel"
          sticky
          style="max-height: calc(100vh - 8rem)"
          class="rounded-lg border border-default"
          :ui="tableUi"
          @keydown.capture="onKeydown"
        >
          <template #username-cell="{ row }">
            <span
              :title="(row.original as AttendanceTableStudent).username ?? ''"
              class="line-clamp-1 font-medium text-highlighted"
            >
              {{ (row.original as AttendanceTableStudent).username ?? '—' }}
            </span>
          </template>
        </UTable>
      </template>
    </UModal>
  </div>
</template>
