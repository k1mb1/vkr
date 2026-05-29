<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { components } from '#open-fetch-schemas/backend'
import type { SectionKey } from '~/composables/useTableSections'
import { h, resolveComponent } from 'vue'
import { groupBySection, scopeVisibleForSection } from '~/composables/useTableSections'

type AttendanceTableResponse = components['schemas']['AttendanceTableResponse']
type AttendanceTableStudent = components['schemas']['AttendanceTableStudent']
type AttendanceTableLesson = components['schemas']['AttendanceTableLesson']
type AttendanceCellResponse = components['schemas']['AttendanceCellResponse']
type AttendanceStatus = NonNullable<AttendanceCellResponse['status']>
type UpsertAttendanceRequest = components['schemas']['UpsertAttendanceRequest']

const props = withDefaults(defineProps<{
  data: AttendanceTableResponse | null | undefined
  pending?: boolean
  sectionsFilter?: string[]
  showLegend?: boolean
  emptyDescription?: string
  editable?: boolean
  pendingChanges?: Record<string, AttendanceStatus>
}>(), {
  pending: false,
  showLegend: true,
  emptyDescription: 'Нет проведений или назначенных студентов.',
  editable: false,
  pendingChanges: () => ({}),
})

const emit = defineEmits<{
  change: [payload: UpsertAttendanceRequest]
}>()

const UBadge = resolveComponent('UBadge')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UButton = resolveComponent('UButton')

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

const lessonTypeIcon: Record<NonNullable<AttendanceTableLesson['type']>, string> = {
  LECTURE: 'i-lucide-presentation',
  PRACTICE: 'i-lucide-flask-conical',
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

function countPresentForStudent(
  student: AttendanceTableStudent,
  scopes: AttendanceTableLesson[],
  cellIndex: Map<string, AttendanceCellResponse>,
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
    if (isAttended(effective))
      n++
  }
  return n
}

function buildScopeColumn(
  scope: AttendanceTableLesson,
  cellIndex: Map<string, AttendanceCellResponse>,
  sectionStudents: AttendanceTableStudent[],
): TableColumn<AttendanceTableStudent> {
  const typeColor = scope.type === 'LECTURE' ? 'primary' : 'secondary'
  const typeIcon = scope.type ? lessonTypeIcon[scope.type] : undefined

  return {
    id: scope.id!,
    header: () =>
      h('div', { class: 'flex flex-col items-center gap-1.5 py-1' }, [
        // Тип занятия
        h(UBadge, {
          variant: 'subtle',
          color: typeColor,
          label: formatLessonType(scope),
          ...(typeIcon ? { leadingIcon: typeIcon } : {}),
          size: 'md',
        }),
        // Дата
        h('div', { class: 'flex items-center gap-1 text-muted text-xs' }, [
          h('span', { class: 'i-lucide-calendar-days w-3 h-3 shrink-0' }),
          h('span', { class: 'tabular-nums font-medium' }, formatScopeDate(scope)),
        ]),
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
            variant: 'ghost',
            color: 'neutral',
            size: 'xs',
            square: !effective,
            class: [
              'min-h-[28px] min-w-[40px] justify-center',
              isDirty ? 'ring-1 ring-primary/60 ring-offset-1 ring-offset-default rounded' : '',
            ],
          }, () => renderBadge()),
        },
      )
    },
    footer: () => h(
      'span',
      { class: 'tabular-nums font-semibold text-default' },
      String(countPresentForScope(scope, sectionStudents, cellIndex)),
    ),
    meta: { class: { th: 'min-w-[120px] text-center', td: 'min-w-[120px] text-center p-1' } },
  }
}

// ─── sections ─────────────────────────────────────────────────────────────────

interface AttSection extends SectionKey {
  students: AttendanceTableStudent[]
  columns: TableColumn<AttendanceTableStudent>[]
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
        footer: () => h('span', { class: 'font-semibold text-default' }, 'Посещено'),
        meta: {
          class: {
            th: 'min-w-[220px] sticky left-0 z-10 bg-default',
            td: 'min-w-[220px] sticky left-0 z-10 bg-default',
          },
        },
      },
    ]

    for (const scope of sectionScopes) {
      if (!scope.id)
        continue
      cols.push(buildScopeColumn(scope, cellIndex.value, sortedStudents))
    }

    cols.push({
      id: 'student-total',
      header: () => h('span', { class: 'font-semibold text-highlighted' }, 'Итого'),
      cell: ({ row }) => h(
        'span',
        { class: 'tabular-nums font-semibold text-default' },
        String(countPresentForStudent(row.original, sectionScopes, cellIndex.value)),
      ),
      footer: () => {
        let total = 0
        for (const s of sortedStudents)
          total += countPresentForStudent(s, sectionScopes, cellIndex.value)
        return h('span', { class: 'tabular-nums font-bold text-highlighted' }, String(total))
      },
      meta: { class: { th: 'min-w-[72px] text-center', td: 'min-w-[72px] text-center' } },
    })

    return {
      ...meta,
      students: sortedStudents,
      columns: cols,
    }
  })
})

const isEmpty = computed(() => sections.value.length === 0)
const hasAnyLessons = computed(() => lessons.value.length > 0)
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Legend -->
    <div v-if="showLegend" class="flex flex-wrap items-center gap-2 text-xs text-muted">
      <span class="font-medium">Легенда:</span>
      <UBadge
        v-for="s in STATUSES"
        :key="s"
        variant="soft"
        :color="statusColor[s]"
        :leading-icon="statusIcon[s]"
        :label="`${statusShort[s]} · ${statusLabel[s]}`"
      />
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
          <UBadge variant="subtle" color="neutral" :label="`${section.students.length}`" />
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
          class="max-h-[calc(100vh-18rem)] rounded-lg border border-default"
          :ui="{
            thead: 'bg-elevated/60',
            tfoot: 'bg-elevated/60 border-t border-default',
            th: 'px-3 py-3 text-sm text-highlighted text-left font-semibold border-r border-default last:border-r-0 [&:has([role=checkbox])]:pe-0',
            td: 'p-3 text-sm text-muted whitespace-nowrap border-r border-default last:border-r-0 [&:has([role=checkbox])]:pe-0',
          }"
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
  </div>
</template>
