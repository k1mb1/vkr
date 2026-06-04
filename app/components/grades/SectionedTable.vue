<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { components } from '#open-fetch-schemas/backend'
import type { SectionKey } from '~/composables/useTableSections'
import { h, resolveComponent } from 'vue'
import { useGridCellNav } from '~/composables/useGridCellNav'
import { applyBonus, applyPenalty, computeBonusCount, computePenaltyCount } from '~/composables/usePenalty'
import { groupBySection } from '~/composables/useTableSections'

type GradingTableResponse = components['schemas']['GradingTableResponse']
type GradingTableStudent = components['schemas']['GradingTableStudent']
type GradingTableLesson = components['schemas']['GradingTableLesson']
type AssignmentResponse = components['schemas']['AssignmentResponse']
type GradeCellResponse = components['schemas']['GradeCellResponse']
type UpsertGradeRequest = components['schemas']['UpsertGradeRequest']

interface PendingGrade {
  score: number
  comment?: string
}

const props = withDefaults(defineProps<{
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
}>(), {
  pending: false,
  showLegend: true,
  emptyDescription: 'Для отображения оценок нужны и студенты, и занятия.',
  editable: false,
  pendingChanges: () => ({}),
  tableMaxHeight: 'calc(100vh - 18rem)',
})

const emit = defineEmits<{
  change: [payload: UpsertGradeRequest]
}>()

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UTooltip = resolveComponent('UTooltip')

const { onKeydown } = useGridCellNav()
const { d } = useI18n()

const tableUi = {
  thead: 'bg-elevated/60',
  tfoot: 'bg-elevated/60 border-t border-default',
  tr: 'group hover:bg-elevated/50 transition-colors',
  th: 'px-3 py-3 text-sm text-highlighted text-center font-semibold border-r border-default last:border-r-0 [&:has([role=checkbox])]:pe-0',
  td: 'p-3 text-sm text-muted whitespace-nowrap text-center border-r border-default last:border-r-0 [&:has([role=checkbox])]:pe-0',
} as const

const students = computed<GradingTableStudent[]>(() => props.data?.students ?? [])

function lessonDate(l: GradingTableLesson): string | undefined {
  const dates = (l.scopes ?? [])
    .map(s => s.startedAt)
    .filter((d): d is string => !!d)
  if (!dates.length)
    return undefined
  return dates.reduce((min, d) => (d < min ? d : min), dates[0]!)
}

const lessons = computed<GradingTableLesson[]>(() =>
  [...(props.data?.lessons ?? [])].sort((a, b) => {
    const at = lessonDate(a) ? new Date(lessonDate(a)!).getTime() : Number.POSITIVE_INFINITY
    const bt = lessonDate(b) ? new Date(lessonDate(b)!).getTime() : Number.POSITIVE_INFINITY
    return at - bt || (a.orderIndex ?? 0) - (b.orderIndex ?? 0)
  }),
)

const assignmentsByLesson = computed<Map<string, AssignmentResponse[]>>(() => {
  const map = new Map<string, AssignmentResponse[]>()
  for (const a of props.data?.assignments ?? []) {
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
  for (const g of props.data?.grades ?? []) {
    if (!g.studentId || !g.lessonId)
      continue
    const key = g.assignmentId
      ? `${g.studentId}:${g.assignmentId}`
      : `${g.studentId}:${g.lessonId}:extra`
    map.set(key, g)
  }
  return map
})

const penaltyCountMap = computed<Map<string, number>>(() => {
  const map = new Map<string, number>()
  const policy = props.data?.penaltyPolicy
  if (!policy?.enabled)
    return map
  for (const grade of props.data?.grades ?? []) {
    if (!grade.studentId)
      continue
    const key = grade.assignmentId
      ? `${grade.studentId}:${grade.assignmentId}`
      : `${grade.studentId}:${grade.lessonId}:extra`
    map.set(key, computePenaltyCount(policy, grade.lessonsOffset))
  }
  return map
})

const bonusCountMap = computed<Map<string, number>>(() => {
  const map = new Map<string, number>()
  const policy = props.data?.penaltyPolicy
  if (!policy?.bonusEnabled)
    return map
  for (const grade of props.data?.grades ?? []) {
    if (!grade.studentId)
      continue
    const key = grade.assignmentId
      ? `${grade.studentId}:${grade.assignmentId}`
      : `${grade.studentId}:${grade.lessonId}:extra`
    map.set(key, computeBonusCount(policy, grade.lessonsOffset))
  }
  return map
})

// ─── edit modal ───────────────────────────────────────────────────────────────

interface EditTarget {
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
  const draft = props.pendingChanges[key]
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

const lessonTypeLabel: Record<NonNullable<GradingTableLesson['type']>, string> = {
  LECTURE: 'Лекция',
  PRACTICE: 'Практика',
}

function formatLessonDate(lesson: GradingTableLesson): string {
  const date = lessonDate(lesson)
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

interface GradeSection extends SectionKey {
  students: GradingTableStudent[]
  columns: TableColumn<GradingTableStudent>[]
}

// ─── column builders ──────────────────────────────────────────────────────────

function renderScoreCell(opts: {
  serverScore: number | undefined
  draftScore: number | undefined
  serverComment: string | undefined
  draftComment: string | undefined
  baseColor: 'primary' | 'neutral' | 'warning'
  penaltyCount?: number
  bonusCount?: number
  required?: boolean
  maxPoints?: number
  onClick?: () => void
}) {
  const { serverScore, draftScore, serverComment, draftComment, baseColor, penaltyCount, bonusCount, required, maxPoints, onClick } = opts
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

  const adjustedLabel = String(Math.round((adjusted ?? 0) * 100) / 100)
  const isBonus = (bonusCount ?? 0) > 0 && (penaltyCount ?? 0) === 0

  const badge = original == null
    ? requiredMissing
      ? h('span', { class: 'i-lucide-circle-alert w-4 h-4 text-error/70' })
      : h('span', { class: 'text-muted/50 text-xs select-none' }, effectiveComment ? '💬' : '·')
    : hasAdjustment
      ? h('div', { class: 'flex flex-col items-center leading-tight gap-0.5' }, [
          h('span', { class: 'text-sm font-semibold tabular-nums text-default' }, String(original)),
          h('span', { class: `text-[10px] font-medium tabular-nums ${isBonus ? 'text-success' : 'text-error'}` }, adjustedLabel),
        ])
      : isDirty
        ? h(UBadge, {
            variant: 'solid',
            color: requiredPartial ? 'warning' : baseColor,
            label: String(original),
            leadingIcon: requiredPartial ? 'i-lucide-triangle-alert' : undefined,
            trailingIcon: effectiveComment ? 'i-lucide-message-square' : undefined,
            class: 'tabular-nums font-semibold',
          })
        : h('div', { class: 'flex items-center justify-center gap-0.5' }, [
            requiredPartial ? h('span', { class: 'i-lucide-triangle-alert w-3.5 h-3.5 text-warning shrink-0' }) : null,
            h('span', { class: `tabular-nums font-semibold ${requiredPartial ? 'text-warning' : 'text-default'}` }, String(original)),
            effectiveComment ? h('span', { class: 'i-lucide-message-square w-3 h-3 text-muted/60 shrink-0' }) : null,
          ])

  // Подсветка обязательного, выполненного не полностью — в любом режиме.
  const highlightClass = requiredMissing
    ? 'ring-1 ring-error/40 rounded bg-error/5'
    : requiredPartial
      ? 'ring-1 ring-warning/40 rounded bg-warning/5'
      : ''

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

function buildAssignmentColumn(
  assignment: AssignmentResponse,
  gradeIndex: Map<string, GradeCellResponse>,
  lesson: GradingTableLesson,
  sectionStudents: GradingTableStudent[],
): TableColumn<GradingTableStudent> {
  return {
    id: assignment.id!,
    header: () =>
      h('div', { class: 'flex flex-col items-center gap-0.5 py-0.5' }, [
        h('div', { class: 'flex items-center gap-1' }, [
          h('span', { class: 'text-sm font-semibold text-highlighted' }, `№${assignment.order}`),
          assignment.required
            ? h('span', { class: 'text-error font-semibold', title: 'Обязательное задание' }, '*')
            : null,
        ]),
        h('span', { class: 'text-[10px] text-muted tabular-nums' }, `${assignment.maxPoints} б`),
      ]),
    cell: ({ row }) => {
      const student = row.original as GradingTableStudent
      const key = `${student.id}:${assignment.id}`
      const g = gradeIndex.get(key)
      const draft = props.pendingChanges[key]
      return renderScoreCell({
        serverScore: g?.score,
        draftScore: draft?.score,
        serverComment: g?.comment,
        draftComment: draft?.comment,
        baseColor: assignment.required ? 'primary' : 'neutral',
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
        h('span', { class: 'font-semibold text-default' }, String(sum)),
        max > 0 ? h('span', { class: 'text-muted/70' }, `/${max}`) : null,
      ])
    },
    meta: { class: { th: 'min-w-[80px] text-center', td: 'min-w-[80px] text-center p-1' } },
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
        h('span', { class: 'text-sm font-bold text-highlighted' }, '+'),
        h('span', { class: 'text-[10px] text-muted' }, 'Доп.'),
      ]),
    cell: ({ row }) => {
      const student = row.original as GradingTableStudent
      const key = `${student.id}:${lessonId}:extra`
      const g = gradeIndex.get(key)
      const draft = props.pendingChanges[key]
      return renderScoreCell({
        serverScore: g?.score,
        draftScore: draft?.score,
        serverComment: g?.comment,
        draftComment: draft?.comment,
        baseColor: 'warning',
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
    meta: { class: { th: 'min-w-[72px] text-center', td: 'min-w-[72px] text-center p-1' } },
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
          h('span', { class: 'text-sm font-semibold text-highlighted' }, typeLabel),
          lesson.active
            ? h('span', {
                class: 'i-lucide-circle-play w-3.5 h-3.5 text-primary shrink-0',
                title: 'Активное занятие — точка отсчёта штрафа',
              })
            : null,
        ]),
        // Дата
        h('span', { class: 'text-xs text-muted tabular-nums' }, formatLessonDate(lesson)),
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

// ─── totals helpers ───────────────────────────────────────────────────────────

function effectiveScoreFor(key: string): number | undefined {
  return props.pendingChanges[key]?.score ?? gradeIndex.value.get(key)?.score
}

function effectivePenalizedScoreFor(key: string): number | undefined {
  const original = effectiveScoreFor(key)
  if (original == null)
    return undefined
  const count = penaltyCountMap.value.get(key) ?? 0
  const policy = props.data?.penaltyPolicy
  if (!policy?.enabled || count <= 0)
    return original
  return applyPenalty(original, count, policy)
}

function sumAssignmentScores(
  students: GradingTableStudent[],
  assignmentId: string,
): number {
  let total = 0
  for (const s of students) {
    if (!s.id)
      continue
    const v = effectivePenalizedScoreFor(`${s.id}:${assignmentId}`)
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
    const v = effectivePenalizedScoreFor(`${s.id}:${lessonId}:extra`)
    if (typeof v === 'number')
      total += v
  }
  return total
}

type GradeCategory = 'required' | 'optional' | 'extra'

const categoryMeta: Record<GradeCategory, { label: string, short: string }> = {
  required: { label: 'Обязательные', short: 'Обяз.' },
  optional: { label: 'Необязательные', short: 'Необяз.' },
  extra: { label: 'Дополнительные', short: 'Доп.' },
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
      const v = effectivePenalizedScoreFor(`${studentId}:${lesson.id}:extra`)
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
      const v = effectivePenalizedScoreFor(`${studentId}:${a.id}`)
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
        h('span', { class: 'font-semibold text-highlighted' }, meta.short),
        maxPerStudent > 0
          ? h('span', { class: 'text-[10px] text-muted tabular-nums' }, `до ${maxPerStudent}`)
          : null,
      ]),
    cell: ({ row }) => {
      const n = studentCategorySum(row.original, sectionLessons, category)
      const rawN = rawCategorySum(row.original, sectionLessons, category)
      const r = (v: number) => Math.round(v * 100) / 100
      const incomplete = category === 'required' && maxPerStudent > 0 && rawN < maxPerStudent
      const hasAdjustment = r(n) !== r(rawN)

      const scoreEl = hasAdjustment
        ? h('div', { class: 'flex flex-col items-center leading-tight gap-0.5' }, [
            h('span', { class: 'tabular-nums font-semibold text-default' }, String(r(rawN))),
            h('span', { class: `text-[10px] font-medium tabular-nums ${n > rawN ? 'text-success' : 'text-error'}` }, String(r(n))),
          ])
        : h('span', { class: n > 0 ? 'tabular-nums font-semibold text-default' : 'tabular-nums text-muted/50' }, String(r(n)))

      if (!incomplete)
        return scoreEl

      return h('div', {
        class: 'flex items-center justify-center gap-1',
        title: `Обязательное выполнено не полностью (${r(rawN)}/${maxPerStudent})`,
      }, [
        h('span', { class: 'i-lucide-triangle-alert w-3.5 h-3.5 text-warning shrink-0' }),
        scoreEl,
      ])
    },
    footer: () => {
      let total = 0
      for (const s of sectionStudents)
        total += studentCategorySum(s, sectionLessons, category)
      return h('span', { class: 'tabular-nums font-bold text-highlighted' }, String(Math.round(total * 100) / 100))
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
        String(Math.round(n * 100) / 100),
      )
    },
    footer: () => {
      const total = sectionStudents.reduce((sum, s) => sum + studentGrandTotal(s, sectionLessons), 0)
      return h('span', { class: 'tabular-nums font-bold text-default' }, String(Math.round(total * 100) / 100))
    },
    meta: { class: { th: 'min-w-[80px] text-center', td: 'min-w-[80px] text-center' } },
  }
}

// ─── sections ─────────────────────────────────────────────────────────────────

const sections = computed<GradeSection[]>(() => {
  const grouped = groupBySection(students.value)
  const visible = props.sectionsFilter
    ? grouped.filter(g => props.sectionsFilter!.includes(g.meta.key))
    : grouped
  const singleLesson = !!props.lessonId

  return visible.map(({ meta, items }) => {
    const sectionLessons = lessons.value.filter(l => lessonVisibleForSection(l, meta))
    const sortedStudents = items.sort((a, b) =>
      (a.username ?? '').localeCompare(b.username ?? '', 'ru'),
    )

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

const fullscreenSectionKey = ref<string | null>(null)
const fullscreenSection = computed(() =>
  sections.value.find(s => s.key === fullscreenSectionKey.value) ?? null,
)
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Legend -->
    <div v-if="showLegend" class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
      <span><span class="text-error font-semibold">*</span> — обязательное задание</span>
      <span><span class="text-warning font-semibold">8</span> <span class="line-through">10</span> — с понижением</span>
      <span><span class="text-success font-semibold">12</span> <span class="line-through">10</span> — с бонусом</span>
      <span class="flex items-center gap-1"><span class="i-lucide-circle-alert w-3.5 h-3.5 text-error/70" /> — обязательное не выполнено</span>
      <span class="flex items-center gap-1"><span class="i-lucide-triangle-alert w-3.5 h-3.5 text-warning" /> — выполнено не полностью</span>
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
          <UBadge variant="subtle" color="neutral" :label="`${section.students.length}`" />
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
              :title="(row.original as GradingTableStudent).username ?? ''"
              class="line-clamp-1 font-medium text-highlighted"
            >
              {{ (row.original as GradingTableStudent).username ?? '—' }}
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
              :title="(row.original as GradingTableStudent).username ?? ''"
              class="line-clamp-1 font-medium text-highlighted"
            >
              {{ (row.original as GradingTableStudent).username ?? '—' }}
            </span>
          </template>
        </UTable>
      </template>
    </UModal>

    <UModal
      :open="editTarget !== null"
      :title="editTarget?.assignment
        ? `Оценка · задание №${editTarget.assignment.order}`
        : 'Дополнительная оценка'"
      @update:open="(v: boolean) => { if (!v) closeEdit() }"
    >
      <template #body>
        <div v-if="editTarget" class="flex flex-col gap-4">
          <div class="flex flex-col gap-1 text-sm">
            <div class="flex justify-between gap-2">
              <span class="text-muted">Студент</span>
              <span class="font-medium text-highlighted">{{ editTarget.studentName }}</span>
            </div>
            <div v-if="editTarget.lessonTopic" class="flex justify-between gap-2">
              <span class="text-muted">Занятие</span>
              <span class="text-default text-right">{{ editTarget.lessonTopic }}</span>
            </div>
            <div v-if="editTarget.assignment" class="flex justify-between gap-2">
              <span class="text-muted">Макс. балл</span>
              <span class="tabular-nums text-default">
                {{ editTarget.maxPoints }}
                <UBadge
                  v-if="editTarget.required"
                  size="xs"
                  variant="solid"
                  color="error"
                  label="req"
                  class="ml-1"
                />
              </span>
            </div>
            <div v-if="editTarget.serverScore != null" class="flex justify-between gap-2">
              <span class="text-muted">Сохранённый балл</span>
              <span class="tabular-nums text-default">{{ editTarget.serverScore }}</span>
            </div>
            <div v-if="editTargetPenaltyCount > 0" class="flex justify-between gap-2">
              <span class="text-muted">Понижений</span>
              <span class="tabular-nums text-default">{{ editTargetPenaltyCount }}</span>
            </div>
            <div v-if="editTargetBonusCount > 0" class="flex justify-between gap-2">
              <span class="text-muted">Бонусов</span>
              <span class="tabular-nums text-default">{{ editTargetBonusCount }}</span>
            </div>
            <div v-if="editTargetFinalScore != null && (editTargetPenaltyCount > 0 || editTargetBonusCount > 0)" class="flex justify-between gap-2">
              <span class="text-muted">Итоговый балл</span>
              <span
                class="tabular-nums font-semibold"
                :class="editTargetBonusCount > 0 && editTargetPenaltyCount === 0 ? 'text-success' : 'text-warning'"
              >{{ Math.round(editTargetFinalScore * 100) / 100 }}</span>
            </div>
          </div>

          <UFormField
            label="Балл"
            :error="editInvalid
              ? editTarget.maxPoints != null && editTarget.score != null && editTarget.score > editTarget.maxPoints
                ? `Не больше ${editTarget.maxPoints}`
                : 'Целое число больше нуля'
              : undefined"
            required
          >
            <div class="flex items-center gap-2">
              <UInput
                v-model.number="editTarget.score"
                type="number"
                :min="1"
                :max="editTarget.maxPoints"
                step="1"
                placeholder="Балл"
                autofocus
                class="flex-1"
                @keydown.enter="saveEdit"
              />
              <UButton
                v-if="editTarget.maxPoints != null"
                color="neutral"
                variant="soft"
                size="sm"
                :label="`Макс. ${editTarget.maxPoints}`"
                :disabled="editTarget.score === editTarget.maxPoints"
                @click="editTarget.score = editTarget.maxPoints ?? null"
              />
            </div>
          </UFormField>

          <UFormField label="Комментарий">
            <UTextarea
              v-model="editTarget.comment"
              :rows="2"
              placeholder="—"
              class="w-full"
            />
          </UFormField>

          <div class="flex justify-end gap-2">
            <UButton color="neutral" variant="soft" @click="closeEdit">
              Отмена
            </UButton>
            <UButton
              color="primary"
              icon="i-lucide-check"
              :disabled="editInvalid"
              @click="saveEdit"
            >
              Применить
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
