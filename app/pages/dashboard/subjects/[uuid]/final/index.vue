<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { components } from '#open-fetch-schemas/backend'
import { h } from 'vue'
import { applyBonus, applyPenalty, computeBonusCount, computePenaltyCount } from '~/composables/usePenalty'
import { groupBySection } from '~/composables/useTableSections'

type GradingTableLesson = components['schemas']['GradingTableLesson']
type AssignmentResponse = components['schemas']['AssignmentResponse']
type GradeCellResponse = components['schemas']['GradeCellResponse']

const route = useRoute()
const subjectId = computed(() => String(route.params.uuid ?? ''))
const { permissionId } = usePermissions()

const { data, pending, error, refresh } = useBackend('/api/grades', {
  method: 'GET',
  query: computed(() => ({ permissionId: permissionId.value, subjectId: subjectId.value })),
  immediate: false,
})

watch(permissionId, pid => pid && refresh(), { immediate: true })

// ─── derived maps ─────────────────────────────────────────────────────────────

const assignmentsByLesson = computed<Map<string, AssignmentResponse[]>>(() => {
  const map = new Map<string, AssignmentResponse[]>()
  for (const a of data.value?.assignments ?? []) {
    if (!a.lessonId)
      continue
    const list = map.get(a.lessonId) ?? []
    list.push(a)
    map.set(a.lessonId, list)
  }
  for (const list of map.values())
    list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  return map
})

const gradeIndex = computed<Map<string, GradeCellResponse>>(() => {
  const map = new Map<string, GradeCellResponse>()
  for (const g of data.value?.grades ?? []) {
    if (!g.studentId || !g.lessonId)
      continue
    const key = g.assignmentId
      ? `${g.studentId}:${g.assignmentId}`
      : `${g.studentId}:${g.lessonId}:extra`
    map.set(key, g)
  }
  return map
})

const attendanceByStudent = computed<Map<string, components['schemas']['StudentAttendanceResponse']>>(() => {
  const map = new Map()
  for (const a of data.value?.attendance ?? []) {
    if (a.studentId)
      map.set(a.studentId, a)
  }
  return map
})

function lessonDate(l: GradingTableLesson): string | undefined {
  const dates = (l.scopes ?? []).map(s => s.startedAt).filter((d): d is string => !!d)
  return dates.length ? dates.reduce((min, d) => (d < min ? d : min), dates[0]!) : undefined
}

const sortedLessons = computed(() =>
  [...(data.value?.lessons ?? [])].sort((a, b) => {
    const at = lessonDate(a) ? new Date(lessonDate(a)!).getTime() : 0
    const bt = lessonDate(b) ? new Date(lessonDate(b)!).getTime() : 0
    return at - bt
  }),
)

// ─── per-student computation ──────────────────────────────────────────────────

interface StudentSummaryRow {
  id: string
  username: string
  required: number
  rawRequired: number
  optional: number
  rawOptional: number
  extra: number
  rawExtra: number
  attendance: number
  attPresent: number
  attLate: number
  attAbsent: number
  attExcused: number
  total: number
  rawTotal: number
  rank: number
}

function effectiveScore(key: string): { score: number, offset: number | null | undefined } {
  const g = gradeIndex.value.get(key)
  return { score: g?.score ?? 0, offset: g?.lessonsOffset }
}

function adjustedScore(key: string): number {
  const { score, offset } = effectiveScore(key)
  if (!score)
    return 0
  const policy = data.value?.penaltyPolicy
  if (!policy)
    return score
  const pc = computePenaltyCount(policy, offset)
  const bc = computeBonusCount(policy, offset)
  const afterPenalty = applyPenalty(score, pc, policy)
  return applyBonus(afterPenalty, bc, policy)
}

function rawScore(key: string): number {
  return effectiveScore(key).score
}

function buildStudentRow(
  student: { id?: string, username?: string },
  sectionLessons: GradingTableLesson[],
): Omit<StudentSummaryRow, 'rank'> {
  const id = student.id!
  let required = 0
  let rawRequired = 0
  let optional = 0
  let rawOptional = 0
  let extra = 0
  let rawExtra = 0

  for (const lesson of sectionLessons) {
    if (!lesson.id)
      continue
    const extraKey = `${id}:${lesson.id}:extra`
    extra += adjustedScore(extraKey)
    rawExtra += rawScore(extraKey)
    for (const a of assignmentsByLesson.value.get(lesson.id) ?? []) {
      if (!a.id)
        continue
      const key = `${id}:${a.id}`
      if (a.required) {
        required += adjustedScore(key)
        rawRequired += rawScore(key)
      }
      else {
        optional += adjustedScore(key)
        rawOptional += rawScore(key)
      }
    }
  }

  const attPolicy = data.value?.attendancePolicy
  const attRaw = attendanceByStudent.value.get(id)
  const attPresent = attRaw?.present ?? 0
  const attLate = attRaw?.late ?? 0
  const attAbsent = attRaw?.absent ?? 0
  const attExcused = attRaw?.excused ?? 0
  let attendance = 0
  if (attPolicy?.enabled && attRaw) {
    attendance = (
      attPresent * (attPolicy.pointsPresent ?? 0)
      + attLate * (attPolicy.pointsLate ?? 0)
      + attAbsent * (attPolicy.pointsAbsent ?? 0)
      + attExcused * (attPolicy.pointsExcused ?? 0)
    )
  }

  const r = (n: number) => Math.round(n * 10) / 10
  const total = r(required + optional + extra + attendance)
  const rawTotal = r(rawRequired + rawOptional + rawExtra + attendance)
  return {
    id,
    username: student.username ?? '—',
    required: r(required),
    rawRequired: r(rawRequired),
    optional: r(optional),
    rawOptional: r(rawOptional),
    extra: r(extra),
    rawExtra: r(rawExtra),
    attendance: r(attendance),
    attPresent,
    attLate,
    attAbsent,
    attExcused,
    total,
    rawTotal,
  }
}

function maxRequired(sectionLessons: GradingTableLesson[]): number {
  let max = 0
  for (const lesson of sectionLessons) {
    if (!lesson.id)
      continue
    for (const a of assignmentsByLesson.value.get(lesson.id) ?? []) {
      if (a.required)
        max += a.maxPoints ?? 0
    }
  }
  return max
}

// ─── sections ─────────────────────────────────────────────────────────────────

interface SummarySection {
  key: string
  label: string
  rows: StudentSummaryRow[]
  maxRequired: number
  avgTotal: number
  maxTotal: number
  minTotal: number
  hasAttendance: boolean
}

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

function lessonVisibleForSection(
  lesson: GradingTableLesson,
  groupId: string,
  subgroupId?: string,
): boolean {
  if (!lesson.scopes || lesson.scopes.length === 0)
    return true
  for (const scope of lesson.scopes) {
    if (scope.allGroups)
      return true
    if (!scope.groupId || scope.groupId !== groupId)
      continue
    if (scope.allowedSubgroupId == null)
      return true
    if (scope.allowedSubgroupId === subgroupId)
      return true
  }
  return false
}

const sections = computed<SummarySection[]>(() => {
  const grouped = groupBySection(data.value?.students ?? [])
  const visible = grouped.filter(g => selectedSections.value.includes(g.meta.key))
  const hasAttendance = !!(data.value?.attendancePolicy?.enabled)

  return visible.map(({ meta, items }) => {
    const sectionLessons = sortedLessons.value.filter(l =>
      lessonVisibleForSection(l, meta.groupId, meta.subgroupId),
    )
    const sorted = [...items].sort((a, b) => (a.username ?? '').localeCompare(b.username ?? '', 'ru'))
    const rawRows = sorted.map(s => buildStudentRow(s, sectionLessons))

    // rank by total desc, ties share rank
    const byTotal = [...rawRows].sort((a, b) => b.total - a.total)
    const rankMap = new Map<string, number>()
    let rank = 1
    for (let i = 0; i < byTotal.length; i++) {
      if (i > 0 && byTotal[i]!.total < byTotal[i - 1]!.total)
        rank = i + 1
      rankMap.set(byTotal[i]!.id, rank)
    }

    const rows: StudentSummaryRow[] = rawRows.map(r => ({ ...r, rank: rankMap.get(r.id) ?? 1 }))
    const totals = rows.map(r => r.total)
    const avgTotal = totals.length ? Math.round((totals.reduce((a, b) => a + b, 0) / totals.length) * 10) / 10 : 0

    return {
      key: meta.key,
      label: meta.label,
      rows,
      maxRequired: maxRequired(sectionLessons),
      avgTotal,
      maxTotal: totals.length ? Math.max(...totals) : 0,
      minTotal: totals.length ? Math.min(...totals) : 0,
      hasAttendance,
    }
  })
})

const allSectionsDeselected = computed(() =>
  sectionOptions.value.length > 0 && selectedSections.value.length === 0,
)

// ─── columns ──────────────────────────────────────────────────────────────────

function renderScoreCell(adjusted: number, raw: number) {
  if (adjusted === raw) {
    return h('span', {
      class: adjusted > 0 ? 'tabular-nums font-semibold text-default' : 'tabular-nums text-muted/50',
    }, String(raw))
  }
  const adjClass = adjusted > raw ? 'text-success' : 'text-error'
  return h('div', { class: 'flex flex-col items-center leading-tight gap-0.5' }, [
    h('span', { class: 'tabular-nums font-semibold text-default' }, String(raw)),
    h('span', { class: `text-[10px] tabular-nums font-medium ${adjClass}` }, String(adjusted)),
  ])
}

const ATT_STATUS_COLUMNS = [
  { key: 'present', short: 'П', label: 'Присутствовал', textClass: 'text-success', field: 'attPresent' },
  { key: 'late', short: 'О', label: 'Опоздал', textClass: 'text-warning', field: 'attLate' },
  { key: 'absent', short: 'Н', label: 'Отсутствовал', textClass: 'text-error', field: 'attAbsent' },
  { key: 'excused', short: 'У', label: 'Уваж. причина', textClass: 'text-info', field: 'attExcused' },
] as const satisfies ReadonlyArray<{
  key: string
  short: string
  label: string
  textClass: string
  field: 'attPresent' | 'attLate' | 'attAbsent' | 'attExcused'
}>

const tableUi = {
  thead: 'bg-elevated/60',
  tfoot: 'bg-elevated/60 border-t border-default',
  tr: 'group hover:bg-elevated/50 transition-colors',
  th: 'px-3 py-3 text-sm text-highlighted text-left font-semibold border-r border-default last:border-r-0',
  td: 'p-3 text-sm text-muted whitespace-nowrap border-r border-default last:border-r-0',
} as const

const fullscreenSectionKey = ref<string | null>(null)
const fullscreenSection = computed(() =>
  sections.value.find(s => s.key === fullscreenSectionKey.value) ?? null,
)

function buildColumns(section: SummarySection): TableColumn<StudentSummaryRow>[] {
  const cols: TableColumn<StudentSummaryRow>[] = [
    {
      accessorKey: 'username',
      header: 'Студент',
      meta: {
        class: {
          th: 'min-w-[220px] sticky left-0 z-10 bg-default',
          td: 'min-w-[220px] sticky left-0 z-10 bg-default group-hover:bg-elevated/50 transition-colors',
        },
      },
    },
    {
      accessorKey: 'required',
      header: () =>
        h('div', { class: 'flex flex-col items-center' }, [
          h('span', { class: 'font-semibold text-highlighted' }, 'Обяз.'),
          section.maxRequired > 0
            ? h('span', { class: 'text-[10px] text-muted tabular-nums' }, `до ${section.maxRequired}`)
            : null,
        ]),
      cell: ({ row }) => {
        const { required: v, rawRequired } = row.original
        const incomplete = section.maxRequired > 0 && rawRequired < section.maxRequired
        return h('div', {
          class: 'flex items-center justify-center gap-1',
          title: incomplete ? `Обязательное выполнено не полностью (${v}/${section.maxRequired})` : undefined,
        }, [
          incomplete
            ? h('span', { class: 'i-lucide-triangle-alert w-3.5 h-3.5 text-warning shrink-0' })
            : null,
          renderScoreCell(v, rawRequired),
        ])
      },
      footer: () => {
        const sum = sections.value.find(s => s.key === section.key)?.rows.reduce((a, r) => a + r.required, 0) ?? 0
        return h('span', { class: 'tabular-nums font-semibold text-default' }, String(Math.round(sum * 10) / 10))
      },
      meta: { class: { th: 'min-w-[80px] text-center', td: 'min-w-[80px] text-center py-1.5' } },
    },
    {
      accessorKey: 'optional',
      header: () => h('span', { class: 'font-semibold text-highlighted' }, 'Необяз.'),
      cell: ({ row }) => renderScoreCell(row.original.optional, row.original.rawOptional),
      footer: () => {
        const sum = sections.value.find(s => s.key === section.key)?.rows.reduce((a, r) => a + r.optional, 0) ?? 0
        return h('span', { class: 'tabular-nums font-semibold text-default' }, String(Math.round(sum * 10) / 10))
      },
      meta: { class: { th: 'min-w-[80px] text-center', td: 'min-w-[80px] text-center py-1.5' } },
    },
    {
      accessorKey: 'extra',
      header: () => h('span', { class: 'font-semibold text-highlighted' }, 'Доп.'),
      cell: ({ row }) => renderScoreCell(row.original.extra, row.original.rawExtra),
      footer: () => {
        const sum = sections.value.find(s => s.key === section.key)?.rows.reduce((a, r) => a + r.extra, 0) ?? 0
        return h('span', { class: 'tabular-nums font-semibold text-default' }, String(Math.round(sum * 10) / 10))
      },
      meta: { class: { th: 'min-w-[72px] text-center', td: 'min-w-[72px] text-center py-1.5' } },
    },
  ]

  for (const att of ATT_STATUS_COLUMNS) {
    cols.push({
      id: `att-${att.key}`,
      header: () => h('span', { class: `font-semibold ${att.textClass}`, title: att.label }, att.short),
      cell: ({ row }) => {
        const n = row.original[att.field]
        return h('span', { class: n > 0 ? 'tabular-nums font-semibold text-default' : 'tabular-nums text-muted/50' }, String(n))
      },
      footer: () => {
        const sum = sections.value.find(s => s.key === section.key)?.rows.reduce((a, r) => a + r[att.field], 0) ?? 0
        return h('span', { class: 'tabular-nums font-bold text-default' }, String(sum))
      },
      meta: { class: { th: 'min-w-[56px] text-center', td: 'min-w-[56px] text-center' } },
    })
  }

  if (section.hasAttendance) {
    cols.push({
      accessorKey: 'attendance',
      header: () => h('span', { class: 'font-semibold text-highlighted', title: 'Балл за посещаемость' }, 'Балл'),
      cell: ({ row }) => {
        const v = row.original.attendance
        return h('span', { class: v !== 0 ? 'tabular-nums font-semibold text-default' : 'tabular-nums text-muted/50' }, String(v))
      },
      footer: () => {
        const sum = sections.value.find(s => s.key === section.key)?.rows.reduce((a, r) => a + r.attendance, 0) ?? 0
        return h('span', { class: 'tabular-nums font-bold text-default' }, String(Math.round(sum * 10) / 10))
      },
      meta: { class: { th: 'min-w-[72px] text-center', td: 'min-w-[72px] text-center' } },
    })
  }

  cols.push({
    accessorKey: 'total',
    header: () => h('span', { class: 'font-bold text-highlighted' }, 'Итого'),
    cell: ({ row }) =>
      h('span', { class: 'tabular-nums font-bold text-default' }, String(row.original.total)),
    footer: () => {
      const sec = sections.value.find(s => s.key === section.key)
      if (!sec)
        return null
      return h('span', { class: 'tabular-nums font-bold text-default', title: 'Средний балл по группе' }, String(sec.avgTotal))
    },
    meta: { class: { th: 'min-w-[80px] text-center', td: 'min-w-[80px] text-center py-1.5' } },
  })

  return cols
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <UPageHeader title="Итоговые оценки">
      <template #links>
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
      icon="i-lucide-circle-alert"
      title="Ошибка загрузки"
      :description="error.message"
    />

    <template v-else>
      <!-- Filters -->
      <div class="flex flex-wrap items-center gap-4">
        <USelectMenu
          v-model="selectedSections"
          multiple
          value-key="value"
          :items="sectionOptions"
          placeholder="Группы"
          class="w-64"
        />
      </div>

      <USkeleton v-if="pending && !data" class="h-64 w-full" />

      <UEmpty
        v-else-if="allSectionsDeselected"
        icon="i-lucide-filter-x"
        title="Группы не выбраны"
        description="Выберите хотя бы одну группу, чтобы увидеть итоговую таблицу."
        variant="naked"
        class="py-6"
      />

      <UEmpty
        v-else-if="!pending && sections.length === 0"
        icon="i-lucide-clipboard-x"
        title="Нет данных"
        description="Нет студентов или занятий для отображения итогов."
        variant="naked"
        class="py-6"
      />

      <template v-else>
        <section
          v-for="section in sections"
          :key="section.key"
          class="flex flex-col gap-3"
        >
          <!-- Section header -->
          <div class="flex flex-wrap items-center gap-3">
            <h3 class="text-sm font-semibold text-default">
              {{ section.label }}
            </h3>
            <span class="text-xs text-muted">{{ section.rows.length }} студ.</span>

            <div class="flex items-center gap-3 ml-auto">
              <span class="text-xs text-muted tabular-nums">
                средний {{ section.avgTotal }} · макс {{ section.maxTotal }} · мин {{ section.minTotal }}
              </span>
              <UButton
                icon="i-lucide-maximize-2"
                color="neutral"
                variant="ghost"
                size="xs"
                title="На весь экран"
                @click="fullscreenSectionKey = section.key"
              />
            </div>
          </div>

          <!-- Table -->
          <UTable
            :data="section.rows"
            :columns="buildColumns(section)"
            :loading="pending && section.rows.length === 0"
            loading-color="primary"
            loading-animation="carousel"
            sticky
            class="rounded-lg border border-default"
            :ui="tableUi"
          >
            <template #username-cell="{ row }">
              <span
                :title="row.original.username"
                class="line-clamp-1 font-medium text-highlighted"
              >{{ row.original.username }}</span>
            </template>
          </UTable>
        </section>
      </template>
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
          :data="fullscreenSection.rows"
          :columns="buildColumns(fullscreenSection)"
          sticky
          style="max-height: calc(100vh - 8rem)"
          class="rounded-lg border border-default"
          :ui="tableUi"
        >
          <template #username-cell="{ row }">
            <span
              :title="row.original.username"
              class="line-clamp-1 font-medium text-highlighted"
            >{{ row.original.username }}</span>
          </template>
        </UTable>
      </template>
    </UModal>
  </div>
</template>
