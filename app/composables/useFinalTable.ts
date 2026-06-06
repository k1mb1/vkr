import type { TableColumn } from '@nuxt/ui'
import type { ComputedRef } from 'vue'
import type { components } from '#open-fetch-schemas/backend'
import type { StudentSummaryRow, SummarySection, TypeBreakdown, TypeMaxes } from '~/composables/useFinalGradesExport'
import { computed, h, ref, watch } from 'vue'
import { UBadge } from '#components'
import { computeVerdict, verdictTone } from '~/composables/useFinalVerdict'
import { applyBonus, applyPenalty, computeBonusCount, computePenaltyCount } from '~/composables/usePenalty'
import { groupBySection } from '~/composables/useTableSections'
import { indexAssignmentsByLesson, indexGrades, sortGradingLessons } from '~/utils/grading'
import { round2 } from '~/utils/number'

type GradingTableResponse = components['schemas']['GradingTableResponse']
type AttendanceTableResponse = components['schemas']['AttendanceTableResponse']
type GradingTableLesson = components['schemas']['GradingTableLesson']

type TypeKey = 'lecture' | 'practice'

interface AttCounts { present: number, late: number, absent: number, excused: number }

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

interface TypeAccum {
  required: number
  rawRequired: number
  optional: number
  rawOptional: number
  extra: number
  rawExtra: number
}

/**
 * Вся логика страницы итоговых оценок: индексация данных, расчёт строк студентов,
 * колонки таблицы и вердикт промежуточной аттестации. Компонент остаётся тонким.
 */
export function useFinalTable(
  data: ComputedRef<GradingTableResponse | null>,
  attData: ComputedRef<AttendanceTableResponse | null>,
) {
  const finalPolicy = computed(() => data.value?.finalAssessmentPolicy ?? null)
  const finalEnabled = computed(() => finalPolicy.value?.enabled ?? false)

  // ─── derived maps ─────────────────────────────────────────────────────────────

  const assignmentsByLesson = computed(() => indexAssignmentsByLesson(data.value?.assignments))
  const gradeIndex = computed(() => indexGrades(data.value?.grades))

  function typeKey(type: string | null | undefined): TypeKey | null {
    if (type === 'LECTURE')
      return 'lecture'
    if (type === 'PRACTICE')
      return 'practice'
    return null
  }

  // studentId → { lecture, practice } attendance status counts, split by lesson type.
  const attCountsByStudent = computed<Map<string, Record<TypeKey, AttCounts>>>(() => {
    const scopeType = new Map<string, TypeKey>()
    for (const l of attData.value?.lessons ?? []) {
      const k = typeKey(l.type)
      if (l.id && k)
        scopeType.set(l.id, k)
    }

    const blank = (): AttCounts => ({ present: 0, late: 0, absent: 0, excused: 0 })
    const map = new Map<string, Record<TypeKey, AttCounts>>()
    for (const c of attData.value?.attendances ?? []) {
      if (!c.studentId || !c.lessonScopeId || !c.status)
        continue
      const k = scopeType.get(c.lessonScopeId)
      if (!k)
        continue
      let rec = map.get(c.studentId)
      if (!rec) {
        rec = { lecture: blank(), practice: blank() }
        map.set(c.studentId, rec)
      }
      const bucket = rec[k]
      if (c.status === 'PRESENT')
        bucket.present++
      else if (c.status === 'LATE')
        bucket.late++
      else if (c.status === 'ABSENT')
        bucket.absent++
      else if (c.status === 'EXCUSED')
        bucket.excused++
    }
    return map
  })

  const sortedLessons = computed(() => sortGradingLessons(data.value?.lessons))

  // ─── per-student computation ──────────────────────────────────────────────────

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

  function emptyAccum(): TypeAccum {
    return { required: 0, rawRequired: 0, optional: 0, rawOptional: 0, extra: 0, rawExtra: 0 }
  }

  function buildStudentRow(
    student: { id?: string, username?: string },
    sectionLessons: GradingTableLesson[],
  ): Omit<StudentSummaryRow, 'rank'> {
    const id = student.id!
    const accum: Record<TypeKey, TypeAccum> = { lecture: emptyAccum(), practice: emptyAccum() }
    let closedRequired = 0

    for (const lesson of sectionLessons) {
      if (!lesson.id)
        continue
      const tk = typeKey(lesson.type)
      if (!tk)
        continue
      const acc = accum[tk]
      const extraKey = `${id}:${lesson.id}:extra`
      acc.extra += adjustedScore(extraKey)
      acc.rawExtra += rawScore(extraKey)
      for (const a of assignmentsByLesson.value.get(lesson.id) ?? []) {
        if (!a.id)
          continue
        const key = `${id}:${a.id}`
        if (a.required) {
          acc.required += adjustedScore(key)
          acc.rawRequired += rawScore(key)
          // Обязательная задача считается закрытой, когда raw-балл достиг максимума.
          const max = a.maxPoints ?? 0
          if (max > 0 && rawScore(key) >= max)
            closedRequired++
        }
        else {
          acc.optional += adjustedScore(key)
          acc.rawOptional += rawScore(key)
        }
      }
    }

    const attPolicy = data.value?.attendancePolicy
    const counts = attCountsByStudent.value.get(id)
    const r = round2

    const buildType = (tk: TypeKey): TypeBreakdown => {
      const acc = accum[tk]
      const c = counts?.[tk] ?? { present: 0, late: 0, absent: 0, excused: 0 }
      let attendance = 0
      if (attPolicy?.enabled) {
        attendance = (
          c.present * (attPolicy.pointsPresent ?? 0)
          + c.late * (attPolicy.pointsLate ?? 0)
          + c.absent * (attPolicy.pointsAbsent ?? 0)
          + c.excused * (attPolicy.pointsExcused ?? 0)
        )
      }
      const subtotal = r(acc.required + acc.optional + acc.extra + attendance)
      const rawSubtotal = r(acc.rawRequired + acc.rawOptional + acc.rawExtra + attendance)
      return {
        required: r(acc.required),
        rawRequired: r(acc.rawRequired),
        optional: r(acc.optional),
        rawOptional: r(acc.rawOptional),
        extra: r(acc.extra),
        rawExtra: r(acc.rawExtra),
        attPresent: c.present,
        attLate: c.late,
        attAbsent: c.absent,
        attExcused: c.excused,
        attendance: r(attendance),
        subtotal,
        rawSubtotal,
      }
    }

    const lecture = buildType('lecture')
    const practice = buildType('practice')
    return {
      id,
      username: student.username ?? '—',
      lecture,
      practice,
      total: r(lecture.subtotal + practice.subtotal),
      rawTotal: r(lecture.rawSubtotal + practice.rawSubtotal),
      closedRequired,
    }
  }

  function typeMaxes(sectionLessons: GradingTableLesson[], tk: TypeKey, hasAttendance: boolean): TypeMaxes {
    let maxRequired = 0
    let maxOptional = 0
    let lessonCount = 0
    for (const lesson of sectionLessons) {
      if (!lesson.id || typeKey(lesson.type) !== tk)
        continue
      lessonCount++
      for (const a of assignmentsByLesson.value.get(lesson.id) ?? []) {
        if (a.required)
          maxRequired += a.maxPoints ?? 0
        else
          maxOptional += a.maxPoints ?? 0
      }
    }
    // Max attendance: 1 point per lesson, i.e. the number of lessons of this type.
    const maxAttendance = hasAttendance ? lessonCount : 0
    const maxSubtotal = round2(maxRequired + maxOptional + maxAttendance)
    return { maxRequired, maxOptional, maxAttendance, maxSubtotal, lessonCount }
  }

  // ─── sections ─────────────────────────────────────────────────────────────────

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

      const rows: StudentSummaryRow[] = rawRows.map(r => ({
        ...r,
        rank: rankMap.get(r.id) ?? 1,
        verdict: finalEnabled.value && finalPolicy.value
          ? verdictForRow(r)?.label
          : undefined,
      }))
      const totals = rows.map(r => r.total)
      const avgTotal = totals.length ? round2(totals.reduce((a, b) => a + b, 0) / totals.length) : 0
      const lecture = typeMaxes(sectionLessons, 'lecture', hasAttendance)
      const practice = typeMaxes(sectionLessons, 'practice', hasAttendance)

      return {
        key: meta.key,
        label: meta.label,
        rows,
        lecture,
        practice,
        maxPossibleTotal: round2(lecture.maxSubtotal + practice.maxSubtotal),
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

  function headerWithMax(label: string, max: number, opts?: { bold?: boolean, title?: string }) {
    return h('div', { class: 'flex flex-col items-center' }, [
      h('span', { class: opts?.bold ? 'font-bold text-highlighted' : 'font-semibold text-highlighted', title: opts?.title }, label),
      max > 0
        ? h('span', { class: 'text-[10px] text-muted tabular-nums' }, `до ${max}`)
        : null,
    ])
  }

  function sumFooter(key: string, sel: (r: StudentSummaryRow) => number, opts?: { int?: boolean, bold?: boolean }) {
    const sum = sections.value.find(s => s.key === key)?.rows.reduce((a, r) => a + sel(r), 0) ?? 0
    const value = opts?.int ? sum : round2(sum)
    return h('span', { class: `tabular-nums ${opts?.bold ? 'font-bold' : 'font-semibold'} text-default` }, String(value))
  }

  function avgFooter(key: string, sel: (r: StudentSummaryRow) => number) {
    const sec = sections.value.find(s => s.key === key)
    if (!sec || !sec.rows.length)
      return null
    const avg = round2(sec.rows.reduce((a, r) => a + sel(r), 0) / sec.rows.length)
    return h('span', { class: 'tabular-nums font-bold text-default', title: 'Среднее по группе' }, String(avg))
  }

  function buildTypeGroup(section: SummarySection, tk: TypeKey, label: string): TableColumn<StudentSummaryRow> {
    const m: TypeMaxes = section[tk]
    const pick = (r: StudentSummaryRow): TypeBreakdown => r[tk]

    const leaf: TableColumn<StudentSummaryRow>[] = [
      {
        id: `${tk}-required`,
        header: () => headerWithMax('Обяз.', m.maxRequired),
        cell: ({ row }) => {
          const b = pick(row.original)
          const incomplete = m.maxRequired > 0 && b.rawRequired < m.maxRequired
          return h('div', {
            class: 'flex items-center justify-center gap-1',
            title: incomplete ? `Обязательное выполнено не полностью (${b.rawRequired}/${m.maxRequired})` : undefined,
          }, [
            incomplete
              ? h('span', { class: 'i-lucide-triangle-alert w-3.5 h-3.5 text-warning shrink-0' })
              : null,
            renderScoreCell(b.required, b.rawRequired),
          ])
        },
        footer: () => sumFooter(section.key, r => pick(r).required),
        meta: { class: { th: 'min-w-[80px] text-center', td: 'min-w-[80px] text-center py-1.5' } },
      },
      {
        id: `${tk}-optional`,
        header: () => headerWithMax('Необяз.', m.maxOptional),
        cell: ({ row }) => renderScoreCell(pick(row.original).optional, pick(row.original).rawOptional),
        footer: () => sumFooter(section.key, r => pick(r).optional),
        meta: { class: { th: 'min-w-[80px] text-center', td: 'min-w-[80px] text-center py-1.5' } },
      },
      {
        id: `${tk}-extra`,
        header: () => h('span', { class: 'font-semibold text-highlighted' }, 'Доп.'),
        cell: ({ row }) => renderScoreCell(pick(row.original).extra, pick(row.original).rawExtra),
        footer: () => sumFooter(section.key, r => pick(r).extra),
        meta: { class: { th: 'min-w-[72px] text-center', td: 'min-w-[72px] text-center py-1.5' } },
      },
    ]

    for (const att of ATT_STATUS_COLUMNS) {
      leaf.push({
        id: `${tk}-att-${att.key}`,
        header: () => h('span', { class: `font-semibold ${att.textClass}`, title: att.label }, att.short),
        cell: ({ row }) => {
          const n = pick(row.original)[att.field]
          return h('span', { class: n > 0 ? 'tabular-nums font-semibold text-default' : 'tabular-nums text-muted/50' }, String(n))
        },
        footer: () => sumFooter(section.key, r => pick(r)[att.field], { int: true, bold: true }),
        meta: { class: { th: 'min-w-[52px] text-center', td: 'min-w-[52px] text-center' } },
      })
    }

    if (section.hasAttendance) {
      leaf.push({
        id: `${tk}-attendance`,
        header: () => headerWithMax('Посещ.', m.maxAttendance, { title: 'Балл за посещаемость' }),
        cell: ({ row }) => {
          const v = pick(row.original).attendance
          return h('span', { class: v !== 0 ? 'tabular-nums font-semibold text-default' : 'tabular-nums text-muted/50' }, String(v))
        },
        footer: () => sumFooter(section.key, r => pick(r).attendance, { bold: true }),
        meta: { class: { th: 'min-w-[64px] text-center', td: 'min-w-[64px] text-center' } },
      })
    }

    leaf.push({
      id: `${tk}-subtotal`,
      header: () => headerWithMax('Подитог', m.maxSubtotal, { bold: true }),
      cell: ({ row }) => h('span', { class: 'tabular-nums font-bold text-default' }, String(pick(row.original).subtotal)),
      footer: () => avgFooter(section.key, r => pick(r).subtotal),
      meta: { class: { th: 'min-w-[80px] text-center', td: 'min-w-[80px] text-center py-1.5' } },
    })

    return {
      id: tk,
      header: () => h('span', { class: 'font-bold text-highlighted' }, label),
      columns: leaf,
    }
  }

  // ─── итоговый вердикт (промежуточная аттестация) ────────────────────────────────

  function verdictForRow(row: Pick<StudentSummaryRow, 'total' | 'closedRequired'>) {
    return computeVerdict(finalPolicy.value!, {
      total: row.total,
      closedRequired: row.closedRequired,
    })
  }

  function buildVerdictColumn(): TableColumn<StudentSummaryRow> {
    return {
      id: 'verdict',
      header: () => h('span', { class: 'font-bold text-highlighted' }, 'Вердикт'),
      cell: ({ row }) => {
        const verdict = verdictForRow(row.original)
        const tone = verdictTone(verdict)
        const parts: string[] = []
        parts.push(`Закрыто обязательных задач: ${row.original.closedRequired}`)
        if (verdict.pointsToNext != null)
          parts.push(`До следующего уровня по баллам: +${verdict.pointsToNext}`)
        if (verdict.tasksToNext != null)
          parts.push(`До следующего уровня по задачам: +${verdict.tasksToNext}`)
        const title = parts.join(' · ')
        return h('div', { class: 'flex justify-center', title }, [
          h(UBadge, {
            color: tone.color,
            variant: 'subtle',
            leadingIcon: tone.icon,
            label: verdict.label,
            class: 'font-semibold',
          }),
        ])
      },
      meta: {
        class: { th: 'min-w-[140px] text-center', td: 'min-w-[140px] text-center py-1.5' },
      },
    }
  }

  function buildColumns(section: SummarySection): TableColumn<StudentSummaryRow>[] {
    return [
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
      buildTypeGroup(section, 'lecture', 'Лекции'),
      buildTypeGroup(section, 'practice', 'Практики'),
      {
        accessorKey: 'total',
        header: () => headerWithMax('Итого', section.maxPossibleTotal, {
          bold: true,
          title: section.hasAttendance ? 'Максимум по заданиям и посещаемости' : 'Максимум по обязательным и необязательным заданиям',
        }),
        cell: ({ row }) =>
          h('span', { class: 'tabular-nums font-bold text-default' }, String(row.original.total)),
        footer: () => avgFooter(section.key, r => r.total),
        meta: { class: { th: 'min-w-[80px] text-center', td: 'min-w-[80px] text-center py-1.5' } },
      },
      ...(finalEnabled.value ? [buildVerdictColumn()] : []),
    ]
  }

  const fullscreenSectionKey = ref<string | null>(null)
  const fullscreenSection = computed(() =>
    sections.value.find(s => s.key === fullscreenSectionKey.value) ?? null,
  )

  return {
    finalEnabled,
    finalPolicy,
    sectionOptions,
    selectedSections,
    sections,
    allSectionsDeselected,
    buildColumns,
    fullscreenSectionKey,
    fullscreenSection,
  }
}
