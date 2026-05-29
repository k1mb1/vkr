<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { components } from '#open-fetch-schemas/backend'
import type { SectionKey } from '~/composables/useTableSections'
import { h, resolveComponent } from 'vue'
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
}>(), {
  pending: false,
  showLegend: true,
  emptyDescription: 'Для отображения оценок нужны и студенты, и занятия.',
  editable: false,
  pendingChanges: () => ({}),
})

const emit = defineEmits<{
  change: [payload: UpsertGradeRequest]
}>()

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UTooltip = resolveComponent('UTooltip')

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
    const at = lessonDate(a) ? new Date(lessonDate(a)!).getTime() : 0
    const bt = lessonDate(b) ? new Date(lessonDate(b)!).getTime() : 0
    return at - bt
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

const lessonTypeIcon: Record<NonNullable<GradingTableLesson['type']>, string> = {
  LECTURE: 'i-lucide-presentation',
  PRACTICE: 'i-lucide-flask-conical',
}

function formatLessonDate(lesson: GradingTableLesson): string {
  const d = lessonDate(lesson)
  if (!d)
    return '—'
  return new Intl.DateTimeFormat('ru', { day: '2-digit', month: 'short' }).format(new Date(d))
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
  onClick?: () => void
}) {
  const { serverScore, draftScore, serverComment, draftComment, baseColor, onClick } = opts
  const effective = draftScore ?? serverScore
  const isDirty = draftScore != null && draftScore !== serverScore
  const effectiveComment = (draftComment ?? serverComment)?.trim() || undefined

  const tooltipParts: string[] = []
  if (isDirty)
    tooltipParts.push('Не сохранено')
  if (effectiveComment)
    tooltipParts.push(effectiveComment)
  const tooltipText = tooltipParts.length ? tooltipParts.join(' · ') : undefined

  const badge = effective == null
    ? h('span', { class: 'text-muted/50 text-xs select-none' }, effectiveComment ? '💬' : '·')
    : h(UBadge, {
        variant: isDirty ? 'solid' : 'soft',
        color: baseColor,
        label: String(effective),
        trailingIcon: effectiveComment ? 'i-lucide-message-square' : undefined,
        class: 'tabular-nums font-semibold',
      })

  const trigger = onClick
    ? h(UButton, {
        variant: 'ghost',
        color: 'neutral',
        size: 'xs',
        square: effective == null,
        class: [
          'min-h-[28px] min-w-[40px] justify-center',
          isDirty ? 'ring-1 ring-primary/60 ring-offset-1 ring-offset-default rounded' : '',
        ],
        onClick,
      }, () => badge)
    : badge

  if (!tooltipText)
    return trigger

  return h(UTooltip, { text: tooltipText }, { default: () => trigger })
}

function buildAssignmentColumn(
  assignment: AssignmentResponse,
  gradeIndex: Map<string, GradeCellResponse>,
  lesson: GradingTableLesson,
): TableColumn<GradingTableStudent> {
  return {
    id: assignment.id!,
    header: () =>
      h('div', { class: 'flex flex-col items-center gap-1 py-0.5' }, [
        h('span', { class: 'text-sm font-bold text-highlighted' }, `№${assignment.order}`),
        h('div', { class: 'flex items-center gap-1' }, [
          h('span', { class: 'text-[10px] text-muted tabular-nums' }, `${assignment.maxPoints} б`),
          assignment.required
            ? h(UBadge, { size: 'xs', variant: 'solid', color: 'error', label: 'req' })
            : null,
        ]),
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
        onClick: props.editable
          ? () => openEdit({ student, lesson, assignment })
          : undefined,
      })
    },
    meta: { class: { th: 'min-w-[80px] text-center', td: 'min-w-[80px] text-center p-1' } },
  }
}

function buildExtraColumn(
  lesson: GradingTableLesson,
  gradeIndex: Map<string, GradeCellResponse>,
): TableColumn<GradingTableStudent> {
  const lessonId = lesson.id!
  return {
    id: `extra-${lessonId}`,
    header: () =>
      h('div', { class: 'flex flex-col items-center gap-1 py-0.5' }, [
        h('span', { class: 'text-sm font-bold text-highlighted' }, '+'),
        h('span', { class: 'text-[10px] text-muted' }, 'extra'),
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
        onClick: props.editable
          ? () => openEdit({ student, lesson })
          : undefined,
      })
    },
    meta: { class: { th: 'min-w-[72px] text-center', td: 'min-w-[72px] text-center p-1' } },
  }
}

function buildLessonGroupColumn(
  lesson: GradingTableLesson,
  childCols: TableColumn<GradingTableStudent>[],
): TableColumn<GradingTableStudent> {
  const typeColor = lesson.type === 'LECTURE' ? 'primary' : 'secondary'
  const typeIcon = lesson.type ? lessonTypeIcon[lesson.type] : undefined
  const typeLabel = lesson.type ? lessonTypeLabel[lesson.type] : '—'

  return {
    id: `lesson-${lesson.id}`,
    header: () =>
      h('div', { class: 'flex flex-col items-center gap-1.5 py-1' }, [
        // Тип занятия
        h(UBadge, {
          variant: 'subtle',
          color: typeColor,
          label: typeLabel,
          ...(typeIcon ? { leadingIcon: typeIcon } : {}),
          size: 'md',
        }),
        // Дата
        h('div', { class: 'flex items-center gap-1 text-muted text-xs' }, [
          h('span', { class: 'i-lucide-calendar-days w-3 h-3 shrink-0' }),
          h('span', { class: 'tabular-nums font-medium' }, formatLessonDate(lesson)),
        ]),
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
    meta: { class: { th: 'text-center border-x border-default' } },
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

    const cols: TableColumn<GradingTableStudent>[] = [
      {
        accessorKey: 'username',
        header: 'Студент',
        meta: {
          class: {
            th: 'min-w-[220px] sticky left-0 z-10 bg-default',
            td: 'min-w-[220px] sticky left-0 z-10 bg-default',
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
          .map(a => buildAssignmentColumn(a, gradeIndex.value, lesson)),
        buildExtraColumn(lesson, gradeIndex.value),
      ]

      if (singleLesson) {
        cols.push(...childCols)
      }
      else {
        cols.push(buildLessonGroupColumn(lesson, childCols))
      }
    }

    return {
      ...meta,
      students: items.sort((a, b) =>
        (a.username ?? '').localeCompare(b.username ?? '', 'ru'),
      ),
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
      <UBadge variant="subtle" color="error" label="req" size="xs" />
      <span class="text-muted">— обязательное задание</span>
      <UBadge variant="soft" color="primary" label="5" class="tabular-nums" />
      <span class="text-muted">/ обязательное</span>
      <UBadge variant="soft" color="neutral" label="3" class="tabular-nums" />
      <span class="text-muted">/ необязательное</span>
      <UBadge variant="soft" color="warning" label="2" class="tabular-nums" />
      <span class="text-muted">/ extra</span>
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
            th: 'px-3 py-3 text-sm text-highlighted text-left font-semibold border-r border-default last:border-r-0 [&:has([role=checkbox])]:pe-0',
            td: 'p-3 text-sm text-muted whitespace-nowrap border-r border-default last:border-r-0 [&:has([role=checkbox])]:pe-0',
          }"
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
      :open="editTarget !== null"
      :title="editTarget?.assignment
        ? `Оценка · задание №${editTarget.assignment.order}`
        : 'Доп. оценка (extra)'"
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
            <UInput
              v-model.number="editTarget.score"
              type="number"
              :min="1"
              :max="editTarget.maxPoints"
              step="1"
              placeholder="Балл"
              autofocus
              class="w-full"
              @keydown.enter="saveEdit"
            />
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
