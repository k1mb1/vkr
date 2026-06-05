import type { TableColumn } from '@nuxt/ui'
import type { Cell } from '@tanstack/vue-table'
import type { components } from '#open-fetch-schemas/backend'
import type { SectionKey } from '~/composables/useTableSections'
import { computed, h } from 'vue'
import { UButton, UDropdownMenu, UIcon } from '#components'
import { useGridCellNav } from '~/composables/useGridCellNav'
import { groupBySection, scopeVisibleForSection } from '~/composables/useTableSections'
import { highlightChipBg, softHighlightBg } from '~/utils/highlight'
import { round2 } from '~/utils/number'

type AttendanceTableResponse = components['schemas']['AttendanceTableResponse']
type AttendanceTableStudent = components['schemas']['AttendanceTableStudent']
type AttendanceTableLesson = components['schemas']['AttendanceTableLesson']
type AttendanceCellResponse = components['schemas']['AttendanceCellResponse']
type AttendanceStatus = NonNullable<AttendanceCellResponse['status']>
type UpsertAttendanceRequest = components['schemas']['UpsertAttendanceRequest']
type AttendancePolicyResponse = components['schemas']['AttendancePolicyResponse']

export interface AttendanceTableProps {
  data: AttendanceTableResponse | null | undefined
  pending?: boolean
  sectionsFilter?: string[]
  showLegend?: boolean
  emptyDescription?: string
  editable?: boolean
  pendingChanges?: Record<string, AttendanceStatus>
  tableMaxHeight?: string
  attendancePolicy?: AttendancePolicyResponse | null
}

export type AttendanceTableEmit = (e: 'change', payload: UpsertAttendanceRequest) => void

// ─── shared status meta ─────────────────────────────────────────────────────────

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

const defaultHighlightColors: Record<AttendanceStatus, string> = {
  PRESENT: '#dcfce7',
  LATE: '#fef3c7',
  ABSENT: '#fee2e2',
  EXCUSED: '#dbeafe',
}

const lessonTypeLabel: Record<NonNullable<AttendanceTableLesson['type']>, string> = {
  LECTURE: 'Лекция',
  PRACTICE: 'Практика',
}

interface AttSection extends SectionKey {
  students: AttendanceTableStudent[]
  columns: TableColumn<AttendanceTableStudent>[]
  filledCells: number
  totalCells: number
}

/**
 * Логика таблицы посещаемости: индексация ячеек, подсчёты, построение колонок
 * (проведения, итоги по статусам, балл) и секции. Компонент только отрисовывает.
 */
export function useAttendanceTable(props: AttendanceTableProps, emit: AttendanceTableEmit) {
  const { onKeydown } = useGridCellNav()
  const { d } = useI18n()

  const policyEnabled = computed(() => !!props.attendancePolicy?.enabled)

  const highlightColors = computed<Record<AttendanceStatus, string | undefined>>(() => ({
    PRESENT: props.data?.highlightPolicy?.presentColor ?? undefined,
    LATE: props.data?.highlightPolicy?.lateColor ?? undefined,
    ABSENT: props.data?.highlightPolicy?.absentColor ?? undefined,
    EXCUSED: props.data?.highlightPolicy?.excusedColor ?? undefined,
  }))

  function statusHighlightColor(status: AttendanceStatus): string {
    return highlightColors.value[status] ?? defaultHighlightColors[status]
  }

  const legendItems = computed(() => STATUSES.map(s => ({
    status: s,
    short: statusShort[s],
    label: statusLabel[s],
    icon: statusIcon[s],
    chipStyle: highlightChipBg(statusHighlightColor(s)),
    textClass: statusTextClass[s],
  })))

  // ─── data ─────────────────────────────────────────────────────────────────────

  const students = computed<AttendanceTableStudent[]>(() => props.data?.students ?? [])

  const lessons = computed<AttendanceTableLesson[]>(() =>
    [...(props.data?.lessons ?? [])].sort((a, b) => {
      const at = a.startedAt ? new Date(a.startedAt).getTime() : Number.POSITIVE_INFINITY
      const bt = b.startedAt ? new Date(b.startedAt).getTime() : Number.POSITIVE_INFINITY
      return at - bt || (a.orderIndex ?? 0) - (b.orderIndex ?? 0)
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
    return d(new Date(scope.startedAt), 'dayMonth')
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
      const effective = props.pendingChanges?.[key] ?? cellIndex.get(key)?.status
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
      const effective = props.pendingChanges?.[key] ?? cellIndex.get(key)?.status
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
          class: `inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold ${statusTextClass[status]}`,
          title: statusLabel[status],
          style: highlightChipBg(statusHighlightColor(status)),
        }, [
          h(UIcon, { name: statusIcon[status], class: 'size-3.5 shrink-0' }),
          statusShort[status],
        ]),
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
    return round2(score)
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
        return h('span', { class: 'tabular-nums font-bold text-default' }, String(round2(total)))
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
      const effective = props.pendingChanges?.[key] ?? cellIndex.value.get(key)?.status
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
        const pendingStatus = props.pendingChanges?.[key]
        const effective = pendingStatus ?? cell?.status
        const isDirty = pendingStatus != null && pendingStatus !== cell?.status

        const renderBadge = () => {
          if (!effective) {
            return h('span', { class: 'text-muted/50 text-xs select-none' }, '·')
          }
          // Контент ячейки — иконка + буква без собственного фона: подложку даёт сам td.
          return h('span', {
            class: `inline-flex items-center gap-1 font-semibold tabular-nums ${statusTextClass[effective]}`,
            title: statusLabel[effective] + (isDirty ? ' · не сохранено' : ''),
          }, [
            h(UIcon, { name: statusIcon[effective], class: 'size-4 shrink-0' }),
            statusShort[effective],
          ])
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
      meta: {
        class: { th: `min-w-[120px] text-center${scope.active ? ' bg-primary/5' : ''}`, td: 'min-w-[120px] text-center p-1' },
        style: {
          td: (cell: Cell<AttendanceTableStudent, unknown>) => {
            const key = `${cell.row.original.id}|${scope.id}`
            const effective = props.pendingChanges?.[key] ?? cellIndex.get(key)?.status
            return effective ? softHighlightBg(statusHighlightColor(effective)) : {}
          },
        },
      },
    }
  }

  // ─── sections ─────────────────────────────────────────────────────────────────

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
        const effective = props.pendingChanges?.[key] ?? cellIndex.value.get(key)?.status
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

  return {
    legendItems,
    sections,
    isEmpty,
    hasAnyLessons,
    onKeydown,
  }
}
