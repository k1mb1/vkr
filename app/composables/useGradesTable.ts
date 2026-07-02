import type { TableColumn } from '@nuxt/ui'
import type { Cell } from '@tanstack/vue-table'
import type { AssignmentResponse, GradeCellResponse, GradingHighlightPolicyResponse, GradingTableLesson, GradingTableResponse, GradingTableStudent, UpsertGradeRequest } from '#hey-api'
import type { SectionKey } from '~/composables/useTableSections'
import { computed, h, ref } from 'vue'
import { UButton, UDropdownMenu, UIcon, UTooltip } from '#components'
import { useGridCellNav } from '~/composables/useGridCellNav'
import { applyBonus, applyPenalty, computeBonusCount, computePenaltyCount } from '~/composables/usePenalty'
import { groupBySection } from '~/composables/useTableSections'
import { gradeCellKey, indexAssignmentsByLesson, indexGrades, sortGradingLessons } from '~/utils/grading'
import { GRADING_HIGHLIGHT_DEFAULTS, highlightChipBg, softHighlightBg } from '~/utils/highlight'
import { round2 } from '~/utils/number'

export interface PendingGrade {
  score: number
  comment?: string
}

export interface GradesTableProps {
  data: GradingTableResponse | null | undefined
  pending?: boolean
  sectionsFilter?: string[]
  lessonId?: string
  showLegend?: boolean
  emptyDescription?: string
  editable?: boolean
  pendingChanges?: Record<string, PendingGrade>
  allLessons?: GradingTableLesson[]
  tableMaxHeight?: string
  /** Сортировка студентов в каждой секции: по алфавиту (по умолчанию) или по рейтингу (сумме баллов). */
  sortBy?: 'name' | 'rating'
  /** Плотность строк таблицы. */
  density?: import('~/utils/tableUi').TableDensity
}

export type GradesTableEmit = (e: 'change', payload: UpsertGradeRequest) => void

export interface EditTarget {
  key: string
  studentId: string
  studentName: string
  lessonId: string
  lessonTopic?: string
  assignment?: AssignmentResponse
  maxPoints?: number
  required?: boolean
  serverScore?: number
  serverComment?: string
  score: number | null
  comment: string
  lessonsOffset?: number | null
}

interface GradeSection extends SectionKey {
  students: GradingTableStudent[]
  columns: TableColumn<GradingTableStudent>[]
}

type CellContext = Cell<GradingTableStudent, unknown>

type GradeCategory = 'required' | 'optional' | 'extra'

const categoryMeta: Record<GradeCategory, { label: string, short: string }> = {
  required: { label: 'Обязательные', short: 'Обяз.' },
  optional: { label: 'Необязательные', short: 'Необяз.' },
  extra: { label: 'Дополнительные', short: 'Доп.' },
}

const lessonTypeLabel: Record<NonNullable<GradingTableLesson['type']>, string> = {
  LECTURE: 'Лекция',
  PRACTICE: 'Практика',
}

/**
 * Логика таблицы оценок: подсветка, индексация, расчёт итогов, построение колонок
 * и состояние модалки редактирования. Компонент отвечает только за разметку.
 */
export function useGradesTable(props: GradesTableProps, emit: GradesTableEmit) {
  const { onKeydown } = useGridCellNav()
  const { d } = useI18n()

  const highlightPolicy = computed<GradingHighlightPolicyResponse | undefined>(
    () => props.data?.highlightPolicy ?? undefined,
  )
  const highlightEnabled = computed(() => highlightPolicy.value?.enabled ?? false)
  // Подсветка работает всегда: включённая политика берёт пользовательские цвета
  // (с откатом к стандартным для незаданных), выключенная — только стандартные.
  const highlightColors = computed(() => {
    const p = highlightPolicy.value
    const on = highlightEnabled.value
    const pick = (custom: string | undefined, fallback: string) =>
      (on && custom) ? custom : fallback
    return {
      assignment: pick(p?.assignmentColor, GRADING_HIGHLIGHT_DEFAULTS.assignmentColor),
      full: pick(p?.fullColor, GRADING_HIGHLIGHT_DEFAULTS.fullColor),
      partialLow: pick(p?.partialLowColor, GRADING_HIGHLIGHT_DEFAULTS.partialLowColor),
      partialHigh: pick(p?.partialHighColor, GRADING_HIGHLIGHT_DEFAULTS.partialHighColor),
    }
  })

  // ─── render helpers ───────────────────────────────────────────────────────────

  /** Мягкая фоновая подсветка ячейки по hex-цвету (пустой объект, если цвета нет). */
  function bgStyle(hex: string | undefined): Record<string, string> {
    return softHighlightBg(hex)
  }

  /** Единый способ отрисовать иконку — через UIcon, а не span с icon-классом. */
  function icon(name: string, cls: string, title?: string) {
    return h(UIcon, { name, class: cls, ...(title ? { title } : {}) })
  }

  /** Текстовый span с классами. */
  function span(cls: string, text: string | number) {
    return h('span', { class: cls }, String(text))
  }

  function cellHighlightColor(
    original: number | null | undefined,
    maxPoints: number | undefined,
  ): string | undefined {
    if (original == null)
      return undefined
    if (maxPoints != null && maxPoints > 0) {
      if (original >= maxPoints)
        return highlightColors.value.full
      if (original > maxPoints / 2)
        return highlightColors.value.partialHigh
      return highlightColors.value.partialLow
    }
    return undefined
  }

  const students = computed<GradingTableStudent[]>(() => props.data?.students ?? [])

  const lessons = computed(() => sortGradingLessons(props.data?.lessons))

  const assignmentsByLesson = computed(() => indexAssignmentsByLesson(props.data?.assignments))
  const gradeIndex = computed(() => indexGrades(props.data?.grades))

  /** Карта ключ-ячейки → количество (штрафов/бонусов) по сдвигу занятий. */
  function offsetCountMap(enabled: boolean, count: (offset: number | null | undefined) => number) {
    const map = new Map<string, number>()
    if (!enabled)
      return map
    for (const g of props.data?.grades ?? []) {
      const key = gradeCellKey(g)
      if (key)
        map.set(key, count(g.lessonsOffset))
    }
    return map
  }

  const penaltyCountMap = computed(() => {
    const policy = props.data?.penaltyPolicy
    return offsetCountMap(!!policy?.enabled, o => computePenaltyCount(policy!, o))
  })

  const bonusCountMap = computed(() => {
    const policy = props.data?.penaltyPolicy
    return offsetCountMap(!!policy?.bonusEnabled, o => computeBonusCount(policy!, o))
  })

  // ─── edit modal ─────────────────────────────────────────────────────────────

  const editTarget = ref<EditTarget | null>(null)

  function openEdit(params: {
    student: GradingTableStudent
    lesson: GradingTableLesson
    assignment?: AssignmentResponse
  }) {
    const { student, lesson, assignment } = params
    if (!student.id || !lesson.id)
      return
    const key = assignment?.id
      ? `${student.id}:${assignment.id}`
      : `${student.id}:${lesson.id}:extra`
    const server = gradeIndex.value.get(key)
    const draft = props.pendingChanges?.[key]
    editTarget.value = {
      key,
      studentId: student.id,
      studentName: student.username ?? '—',
      lessonId: lesson.id,
      lessonTopic: lesson.topic,
      assignment,
      maxPoints: assignment?.maxPoints,
      required: assignment?.required,
      serverScore: server?.score,
      serverComment: server?.comment,
      score: draft?.score ?? server?.score ?? assignment?.maxPoints ?? null,
      comment: draft?.comment ?? server?.comment ?? '',
      lessonsOffset: server?.lessonsOffset,
    }
  }

  function closeEdit() {
    editTarget.value = null
  }

  function saveEdit() {
    const t = editTarget.value
    if (!t || t.score == null || t.score <= 0)
      return
    if (t.maxPoints != null && t.score > t.maxPoints)
      return
    const payload: UpsertGradeRequest = {
      studentId: t.studentId,
      lessonId: t.lessonId,
      score: t.score,
      ...(t.assignment?.id ? { assignmentId: t.assignment.id } : {}),
      ...(t.comment.trim() ? { comment: t.comment.trim() } : {}),
    }
    emit('change', payload)
    closeEdit()
  }

  const editTargetPenaltyCount = computed(() => {
    const policy = props.data?.penaltyPolicy
    if (!policy?.enabled || editTarget.value?.lessonsOffset == null)
      return 0
    return computePenaltyCount(policy, editTarget.value.lessonsOffset)
  })

  const editTargetBonusCount = computed(() => {
    const policy = props.data?.penaltyPolicy
    if (!policy?.bonusEnabled || editTarget.value?.lessonsOffset == null)
      return 0
    return computeBonusCount(policy, editTarget.value.lessonsOffset)
  })

  const editTargetFinalScore = computed(() => {
    if (!editTarget.value || editTarget.value.score == null)
      return null
    const policy = props.data?.penaltyPolicy
    if (!policy)
      return editTarget.value.score
    const afterPenalty = applyPenalty(editTarget.value.score, editTargetPenaltyCount.value, policy)
    return applyBonus(afterPenalty, editTargetBonusCount.value, policy)
  })

  const editInvalid = computed(() => {
    const t = editTarget.value
    if (!t || t.score == null || t.score <= 0 || !Number.isInteger(t.score))
      return true
    if (t.maxPoints != null && t.score > t.maxPoints)
      return true
    return false
  })

  function formatLessonDate(lesson: GradingTableLesson): string {
    const date = gradingLessonDate(lesson)
    if (!date)
      return '—'
    return d(new Date(date), 'dayMonth')
  }

  function lessonVisibleForSection(lesson: GradingTableLesson, section: SectionKey): boolean {
    if (!lesson.scopes || lesson.scopes.length === 0)
      return true
    for (const scope of lesson.scopes) {
      if (scope.allGroups)
        return true
      if (!scope.groupId || scope.groupId !== section.groupId)
        continue
      if (scope.allowedSubgroupId == null)
        return true
      if (scope.allowedSubgroupId === section.subgroupId)
        return true
    }
    return false
  }

  // ─── column builders ──────────────────────────────────────────────────────────

  function renderScoreCell(opts: {
    serverScore: number | undefined
    draftScore: number | undefined
    serverComment: string | undefined
    draftComment: string | undefined
    penaltyCount?: number
    bonusCount?: number
    required?: boolean
    maxPoints?: number
    onClick?: () => void
  }) {
    const { serverScore, draftScore, serverComment, draftComment, penaltyCount, bonusCount, required, maxPoints, onClick } = opts
    const original = draftScore ?? serverScore
    const isDirty = draftScore != null && draftScore !== serverScore
    const effectiveComment = (draftComment ?? serverComment)?.trim() || undefined
    const policy = props.data?.penaltyPolicy

    // Обязательное задание не выполнено полностью: нет оценки или меньше максимума.
    const requiredMissing = required && original == null
    const requiredPartial = required && original != null && maxPoints != null && original < maxPoints

    let adjusted = original
    if (original != null && policy) {
      const afterPenalty = applyPenalty(original, penaltyCount ?? 0, policy)
      adjusted = applyBonus(afterPenalty, bonusCount ?? 0, policy)
    }

    const hasAdjustment = original != null && adjusted != null && adjusted !== original

    const tooltipParts: string[] = []
    if (isDirty)
      tooltipParts.push('Не сохранено')
    if (hasAdjustment) {
      tooltipParts.push(`Исходный: ${original}`)
      if (penaltyCount && penaltyCount > 0)
        tooltipParts.push(`Понижений: ${penaltyCount}`)
      if (bonusCount && bonusCount > 0)
        tooltipParts.push(`Бонусов: ${bonusCount}`)
    }
    if (requiredMissing)
      tooltipParts.push('Обязательное не выполнено')
    else if (requiredPartial)
      tooltipParts.push(`Обязательное выполнено не полностью (${original}/${maxPoints})`)
    if (effectiveComment)
      tooltipParts.push(effectiveComment)
    const tooltipText = tooltipParts.length ? tooltipParts.join(' · ') : undefined

    const adjustedLabel = String(round2(adjusted ?? 0))
    const isBonus = (bonusCount ?? 0) > 0 && (penaltyCount ?? 0) === 0

    // Единый стиль ячейки: всегда обычный текст с числом (как в колонках итогов),
    // подсветка задаётся фоном ячейки через meta.style.td, а не формой бейджа.
    const badge = original == null
      ? requiredMissing
        ? null
        : span('text-muted/50 text-xs select-none', effectiveComment ? '💬' : '·')
      : hasAdjustment
        ? h('div', { class: 'flex flex-col items-center leading-tight gap-0.5' }, [
            span('text-sm font-semibold tabular-nums text-default', original),
            span(`text-[10px] font-medium tabular-nums ${isBonus ? 'text-success' : 'text-error'}`, adjustedLabel),
          ])
        : h('div', { class: 'flex items-center justify-center gap-0.5' }, [
            requiredPartial ? icon('i-lucide-triangle-alert', 'size-4 shrink-0 text-warning') : null,
            span(`tabular-nums font-semibold ${requiredPartial ? 'text-warning' : 'text-default'}`, original),
            effectiveComment ? icon('i-lucide-message-square', 'size-4 shrink-0 text-muted/60') : null,
          ])

    // Подсветка обязательного, выполненного не полностью — в любом режиме.
    const highlightClass = ''

    const trigger = onClick
      ? h(UButton, {
          'variant': 'ghost',
          'color': 'neutral',
          'size': 'xs',
          'square': original == null,
          'data-cell-nav': 'true',
          'class': [
            'min-h-[28px] min-w-[40px] justify-center',
            isDirty ? 'ring-1 ring-primary/60 ring-offset-1 ring-offset-default rounded' : '',
            highlightClass,
          ],
          onClick,
        }, () => badge)
      : highlightClass
        ? h('div', { class: ['inline-flex min-h-[28px] min-w-[40px] items-center justify-center', highlightClass] }, [badge])
        : badge

    if (!tooltipText)
      return trigger

    return h(UTooltip, { text: tooltipText }, { default: () => trigger })
  }

  // Массовое проставление балла всему столбцу задания. Как в посещаемости,
  // не эмитим ячейки, где значение уже совпадает — иначе лишние upsert'ы.
  function bulkSetAssignmentScore(
    assignment: AssignmentResponse,
    sectionStudents: GradingTableStudent[],
    score: number,
  ) {
    const assignmentId = assignment.id
    const lessonId = assignment.lessonId
    if (!assignmentId || !lessonId)
      return
    for (const s of sectionStudents) {
      if (!s.id)
        continue
      const key = `${s.id}:${assignmentId}`
      if (effectiveScoreFor(key) === score)
        continue
      emit('change', { studentId: s.id, lessonId, assignmentId, score })
    }
  }

  function buildAssignmentColumn(
    assignment: AssignmentResponse,
    gradeIndex: Map<string, GradeCellResponse>,
    lesson: GradingTableLesson,
    sectionStudents: GradingTableStudent[],
  ): TableColumn<GradingTableStudent> {
    const assignmentHex = computed(() => highlightColors.value.assignment)
    const maxPoints = assignment.maxPoints ?? 0
    const bulkItems = maxPoints > 0
      ? [
          {
            label: `Всем: макс. балл (${maxPoints})`,
            icon: 'i-lucide-check-check',
            onSelect: () => bulkSetAssignmentScore(assignment, sectionStudents, maxPoints),
          },
          {
            label: 'Только пустым: макс. балл',
            icon: 'i-lucide-list-plus',
            onSelect: () => {
              for (const s of sectionStudents) {
                if (!s.id)
                  continue
                if (effectiveScoreFor(`${s.id}:${assignment.id}`) == null)
                  emit('change', { studentId: s.id, lessonId: assignment.lessonId!, assignmentId: assignment.id!, score: maxPoints })
              }
            },
          },
        ]
      : []

    return {
      id: assignment.id!,
      header: () => {
        const hex = assignmentHex.value
        return h('div', {
          class: 'flex flex-col items-center gap-0.5 py-0.5 px-1',
        }, [
          h('div', { class: 'flex items-center gap-1' }, [
            hex
              ? h('span', { class: 'size-2.5 rounded-full', style: { backgroundColor: hex } })
              : null,
            span('text-sm font-semibold text-highlighted', `№${assignment.order}`),
            assignment.required
              ? h('span', { class: 'text-error font-semibold', title: 'Обязательное задание' }, '*')
              : null,
          ]),
          span('text-[10px] text-muted tabular-nums', `${assignment.maxPoints} б`),
          // Массовое проставление балла всему столбцу
          props.editable && bulkItems.length
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
                    title: 'Проставить балл всей группе',
                  }),
                },
              )
            : null,
        ])
      },
      cell: ({ row }) => {
        const student = row.original as GradingTableStudent
        const key = `${student.id}:${assignment.id}`
        const g = gradeIndex.get(key)
        const draft = props.pendingChanges?.[key]
        return renderScoreCell({
          serverScore: g?.score,
          draftScore: draft?.score,
          serverComment: g?.comment,
          draftComment: draft?.comment,
          penaltyCount: penaltyCountMap.value.get(key),
          bonusCount: bonusCountMap.value.get(key),
          required: assignment.required,
          maxPoints: assignment.maxPoints,
          onClick: props.editable
            ? () => openEdit({ student, lesson, assignment })
            : undefined,
        })
      },
      footer: () => {
        const sum = sumAssignmentScores(sectionStudents, assignment.id!)
        const max = (assignment.maxPoints ?? 0) * sectionStudents.filter(s => !!s.id).length
        return h('span', { class: 'tabular-nums', title: 'Сумма / максимум по группе' }, [
          span('font-semibold text-default', sum),
          max > 0 ? span('text-muted/70', `/${max}`) : null,
        ])
      },
      meta: {
        class: { th: 'min-w-[80px] text-center', td: 'min-w-[80px] text-center p-1' },
        style: {
          th: () => highlightChipBg(assignmentHex.value),
          td: (cell: CellContext) => {
            const student = cell.row.original
            const key = `${student.id}:${assignment.id}`
            const g = gradeIndex.get(key)
            const draft = props.pendingChanges?.[key]
            const original = draft?.score ?? g?.score
            if (assignment.required && original == null)
              return bgStyle('#fee2e2')
            return bgStyle(cellHighlightColor(original, assignment.maxPoints))
          },
        },
      },
    }
  }

  function buildExtraColumn(
    lesson: GradingTableLesson,
    gradeIndex: Map<string, GradeCellResponse>,
    sectionStudents: GradingTableStudent[],
  ): TableColumn<GradingTableStudent> {
    const lessonId = lesson.id!
    return {
      id: `extra-${lessonId}`,
      header: () =>
        h('div', { class: 'flex flex-col items-center gap-1 py-0.5' }, [
          span('text-sm font-bold text-highlighted', '+'),
          span('text-[10px] text-muted', 'Доп.'),
        ]),
      cell: ({ row }) => {
        const student = row.original as GradingTableStudent
        const key = `${student.id}:${lessonId}:extra`
        const g = gradeIndex.get(key)
        const draft = props.pendingChanges?.[key]
        return renderScoreCell({
          serverScore: g?.score,
          draftScore: draft?.score,
          serverComment: g?.comment,
          draftComment: draft?.comment,
          penaltyCount: penaltyCountMap.value.get(key),
          bonusCount: bonusCountMap.value.get(key),
          onClick: props.editable
            ? () => openEdit({ student, lesson })
            : undefined,
        })
      },
      footer: () => h(
        'span',
        { class: 'tabular-nums font-semibold text-default' },
        String(sumExtraScores(sectionStudents, lessonId)),
      ),
      meta: {
        class: { th: 'min-w-[72px] text-center', td: 'min-w-[72px] text-center p-1' },
        style: {
          td: (cell: CellContext) => {
            const student = cell.row.original
            const key = `${student.id}:${lessonId}:extra`
            const g = gradeIndex.get(key)
            const draft = props.pendingChanges?.[key]
            const original = draft?.score ?? g?.score
            return bgStyle(cellHighlightColor(original, undefined))
          },
        },
      },
    }
  }

  function buildLessonGroupColumn(
    lesson: GradingTableLesson,
    childCols: TableColumn<GradingTableStudent>[],
  ): TableColumn<GradingTableStudent> {
    const baseLabel = lesson.type ? lessonTypeLabel[lesson.type] : '—'
    const typeLabel = lesson.orderIndex ? `${baseLabel} №${lesson.orderIndex}` : baseLabel

    return {
      id: `lesson-${lesson.id}`,
      header: () =>
        h('div', { class: 'flex flex-col items-center gap-1 py-1' }, [
          // Тип занятия + метка активного
          h('div', { class: 'flex items-center gap-1' }, [
            span('text-sm font-semibold text-highlighted', typeLabel),
            lesson.active
              ? icon('i-lucide-circle-play', 'size-3.5 text-primary shrink-0', 'Активное занятие — точка отсчёта штрафа')
              : null,
          ]),
          // Дата
          span('text-xs text-muted tabular-nums', formatLessonDate(lesson)),
          // Тема
          lesson.topic
            ? h(
                'span',
                {
                  class: 'line-clamp-2 max-w-[180px] text-center text-[11px] text-muted leading-snug',
                  title: lesson.topic,
                },
                lesson.topic,
              )
            : null,
        ]),
      columns: childCols,
      meta: { class: { th: `text-center border-x border-default${lesson.active ? ' bg-primary/5' : ''}` } },
    }
  }

  // ─── totals helpers ─────────────────────────────────────────────────────────

  function effectiveScoreFor(key: string): number | undefined {
    return props.pendingChanges?.[key]?.score ?? gradeIndex.value.get(key)?.score
  }

  function effectiveAdjustedScoreFor(key: string): number | undefined {
    const original = effectiveScoreFor(key)
    if (original == null)
      return undefined
    const policy = props.data?.penaltyPolicy
    if (!policy)
      return original
    const afterPenalty = applyPenalty(original, penaltyCountMap.value.get(key) ?? 0, policy)
    return applyBonus(afterPenalty, bonusCountMap.value.get(key) ?? 0, policy)
  }

  function sumAssignmentScores(
    students: GradingTableStudent[],
    assignmentId: string,
  ): number {
    let total = 0
    for (const s of students) {
      if (!s.id)
        continue
      const v = effectiveAdjustedScoreFor(`${s.id}:${assignmentId}`)
      if (typeof v === 'number')
        total += v
    }
    return total
  }

  function sumExtraScores(
    students: GradingTableStudent[],
    lessonId: string,
  ): number {
    let total = 0
    for (const s of students) {
      if (!s.id)
        continue
      const v = effectiveAdjustedScoreFor(`${s.id}:${lessonId}:extra`)
      if (typeof v === 'number')
        total += v
    }
    return total
  }

  function studentCategorySum(
    student: GradingTableStudent,
    lessons: GradingTableLesson[],
    category: GradeCategory,
  ): number {
    const studentId = student.id
    if (!studentId)
      return 0
    let total = 0
    for (const lesson of lessons) {
      if (!lesson.id)
        continue
      if (category === 'extra') {
        const v = effectiveAdjustedScoreFor(`${studentId}:${lesson.id}:extra`)
        if (typeof v === 'number')
          total += v
        continue
      }
      const assignments = assignmentsByLesson.value.get(lesson.id) ?? []
      for (const a of assignments) {
        if (!a.id)
          continue
        const isReq = !!a.required
        if (category === 'required' && !isReq)
          continue
        if (category === 'optional' && isReq)
          continue
        const v = effectiveAdjustedScoreFor(`${studentId}:${a.id}`)
        if (typeof v === 'number')
          total += v
      }
    }
    return total
  }

  function rawCategorySum(
    student: GradingTableStudent,
    lessons: GradingTableLesson[],
    category: GradeCategory,
  ): number {
    const studentId = student.id
    if (!studentId)
      return 0
    let total = 0
    for (const lesson of lessons) {
      if (!lesson.id)
        continue
      if (category === 'extra') {
        const v = effectiveScoreFor(`${studentId}:${lesson.id}:extra`)
        if (typeof v === 'number')
          total += v
        continue
      }
      const assignments = assignmentsByLesson.value.get(lesson.id) ?? []
      for (const a of assignments) {
        if (!a.id)
          continue
        const isReq = !!a.required
        if (category === 'required' && !isReq)
          continue
        if (category === 'optional' && isReq)
          continue
        const v = effectiveScoreFor(`${studentId}:${a.id}`)
        if (typeof v === 'number')
          total += v
      }
    }
    return total
  }

  function categoryMaxPerStudent(lessons: GradingTableLesson[], category: GradeCategory): number {
    if (category === 'extra')
      return 0
    let total = 0
    for (const lesson of lessons) {
      if (!lesson.id)
        continue
      const assignments = assignmentsByLesson.value.get(lesson.id) ?? []
      for (const a of assignments) {
        const isReq = !!a.required
        if (category === 'required' && !isReq)
          continue
        if (category === 'optional' && isReq)
          continue
        total += a.maxPoints ?? 0
      }
    }
    return total
  }

  function buildCategoryTotalColumn(
    category: GradeCategory,
    sectionLessons: GradingTableLesson[],
    sectionStudents: GradingTableStudent[],
  ): TableColumn<GradingTableStudent> {
    const meta = categoryMeta[category]
    const maxPerStudent = categoryMaxPerStudent(sectionLessons, category)
    return {
      id: `student-total-${category}`,
      header: () =>
        h('div', { class: 'flex flex-col items-center py-0.5' }, [
          span('font-semibold text-highlighted', meta.short),
          maxPerStudent > 0
            ? span('text-[10px] text-muted tabular-nums', `до ${maxPerStudent}`)
            : null,
        ]),
      cell: ({ row }) => {
        const n = studentCategorySum(row.original, sectionLessons, category)
        const rawN = rawCategorySum(row.original, sectionLessons, category)
        const r = round2
        const incomplete = category === 'required' && maxPerStudent > 0 && rawN < maxPerStudent
        const hasAdjustment = r(n) !== r(rawN)

        const scoreEl = hasAdjustment
          ? h('div', { class: 'flex flex-col items-center leading-tight gap-0.5' }, [
              span('tabular-nums font-semibold text-default', r(rawN)),
              span(`text-[10px] font-medium tabular-nums ${n > rawN ? 'text-success' : 'text-error'}`, r(n)),
            ])
          : span(n > 0 ? 'tabular-nums font-semibold text-default' : 'tabular-nums text-muted/50', r(n))

        if (!incomplete)
          return scoreEl

        return h('div', {
          class: 'flex items-center justify-center gap-1',
          title: `Обязательное выполнено не полностью (${r(rawN)}/${maxPerStudent})`,
        }, [
          icon('i-lucide-triangle-alert', 'size-3.5 text-warning shrink-0'),
          scoreEl,
        ])
      },
      footer: () => {
        let total = 0
        for (const s of sectionStudents)
          total += studentCategorySum(s, sectionLessons, category)
        return h('span', { class: 'tabular-nums font-bold text-highlighted' }, String(round2(total)))
      },
      meta: { class: { th: 'min-w-[72px] text-center', td: 'min-w-[72px] text-center' } },
    }
  }

  function studentGrandTotal(student: GradingTableStudent, lessons: GradingTableLesson[]): number {
    return (
      studentCategorySum(student, lessons, 'required')
      + studentCategorySum(student, lessons, 'optional')
      + studentCategorySum(student, lessons, 'extra')
    )
  }

  function buildGrandTotalColumn(
    sectionLessons: GradingTableLesson[],
    sectionStudents: GradingTableStudent[],
  ): TableColumn<GradingTableStudent> {
    return {
      id: 'student-grand-total',
      header: () => h('span', { class: 'font-bold text-highlighted' }, 'Итого'),
      cell: ({ row }) => {
        const n = studentGrandTotal(row.original, sectionLessons)
        return h(
          'span',
          { class: 'tabular-nums font-bold text-default' },
          String(round2(n)),
        )
      },
      footer: () => {
        const total = sectionStudents.reduce((sum, s) => sum + studentGrandTotal(s, sectionLessons), 0)
        return h('span', { class: 'tabular-nums font-bold text-default' }, String(round2(total)))
      },
      meta: { class: { th: 'min-w-[80px] text-center', td: 'min-w-[80px] text-center' } },
    }
  }

  // ─── sections ───────────────────────────────────────────────────────────────

  const sections = computed<GradeSection[]>(() => {
    const grouped = groupBySection(students.value)
    const visible = props.sectionsFilter
      ? grouped.filter(g => props.sectionsFilter!.includes(g.meta.key))
      : grouped
    const singleLesson = !!props.lessonId

    return visible.map(({ meta, items }) => {
      const sectionLessons = lessons.value.filter(l => lessonVisibleForSection(l, meta))
      const byName = (a: GradingTableStudent, b: GradingTableStudent) =>
        (a.username ?? '').localeCompare(b.username ?? '', 'ru')
      const sortedStudents = [...items].sort((a, b) => {
        if (props.sortBy === 'rating') {
          const diff = studentGrandTotal(b, sectionLessons) - studentGrandTotal(a, sectionLessons)
          if (diff !== 0)
            return diff
        }
        return byName(a, b)
      })

      const cols: TableColumn<GradingTableStudent>[] = [
        {
          accessorKey: 'username',
          header: 'Студент',
          footer: () => h('span', { class: 'font-semibold text-default' }, 'Итого по группе'),
          meta: {
            class: {
              th: 'min-w-[220px] sticky left-0 z-10 bg-default text-left',
              td: 'min-w-[220px] sticky left-0 z-10 bg-default text-left group-hover:bg-elevated/50 transition-colors',
            },
          },
        },
      ]

      for (const lesson of sectionLessons) {
        if (!lesson.id)
          continue
        const assignments = assignmentsByLesson.value.get(lesson.id) ?? []
        const childCols: TableColumn<GradingTableStudent>[] = [
          ...assignments
            .filter(a => !!a.id)
            .map(a => buildAssignmentColumn(a, gradeIndex.value, lesson, sortedStudents)),
          buildExtraColumn(lesson, gradeIndex.value, sortedStudents),
        ]

        if (singleLesson) {
          cols.push(...childCols)
        }
        else {
          cols.push(buildLessonGroupColumn(lesson, childCols))
        }
      }

      const categories: GradeCategory[] = ['required', 'optional', 'extra']
      for (const cat of categories)
        cols.push(buildCategoryTotalColumn(cat, sectionLessons, sortedStudents))

      cols.push(buildGrandTotalColumn(sectionLessons, sortedStudents))

      return {
        ...meta,
        students: sortedStudents,
        columns: cols,
      }
    })
  })

  const isEmpty = computed(() => sections.value.length === 0)
  const hasAnyLessons = computed(() => lessons.value.length > 0)

  return {
    sections,
    isEmpty,
    hasAnyLessons,
    onKeydown,
    highlightEnabled,
    highlightColors,
    // edit modal
    editTarget,
    closeEdit,
    saveEdit,
    editInvalid,
    editTargetPenaltyCount,
    editTargetBonusCount,
    editTargetFinalScore,
  }
}
