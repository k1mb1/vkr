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
  _attData: ComputedRef<AttendanceTableResponse | null>,
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

    const r = round2

    const buildType = (tk: TypeKey): TypeBreakdown => {
      const acc = accum[tk]
      const subtotal = r(acc.required + acc.optional + acc.extra)
      const rawSubtotal = r(acc.rawRequired + acc.rawOptional + acc.rawExtra)
      return {
        required: r(acc.required),
        rawRequired: r(acc.rawRequired),
        optional: r(acc.optional),
        rawOptional: r(acc.rawOptional),
        extra: r(acc.extra),
        rawExtra: r(acc.rawExtra),
        attPresent: 0,
        attLate: 0,
        attAbsent: 0,
        attExcused: 0,
        attendance: 0,
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
      const avgTotal = totals.length ? round2(totals.reduce((a, b) => a + b, 0) / totals.length) : 0
      const lecture = typeMaxes(sectionLessons, 'lecture', false)
      const practice = typeMaxes(sectionLessons, 'practice', false)

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
        hasAttendance: false,
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

  function verdictForRow(row: StudentSummaryRow) {
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
