<script setup lang="ts">
import type { LessonType, PresenceType, SubjectAttendanceResponse } from '#shared/types/backend'
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import { PRESENCE_TYPES } from '#shared/types/backend'
import { h, resolveComponent } from 'vue'
import { upsertLessonAttendance } from '~/composables/api/useAttendanceApi'
import { useApiError } from '~/composables/useApiError'

interface Props {
  data: SubjectAttendanceResponse | null
  loading?: boolean
  activeType?: string
}

const props = withDefaults(defineProps<Props>(), {
  activeType: 'ALL',
})

const emit = defineEmits<{
  refresh: []
}>()

const { toastError } = useApiError()

const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UIcon = resolveComponent('UIcon')

const PRESENCE_META: Record<
  PresenceType,
  { icon: string, label: string, color: string }
> = {
  NONE: {
    icon: 'i-lucide-minus',
    label: 'Не отмечено',
    color: 'neutral',
  },
  PRESENT: {
    icon: 'i-lucide-check',
    label: 'Присутствовал',
    color: 'success',
  },
  LATE: {
    icon: 'i-lucide-clock',
    label: 'Опоздание',
    color: 'warning',
  },
  NOT_PRESENT: {
    icon: 'i-lucide-x',
    label: 'Отсутствовал',
    color: 'error',
  },
}

const LESSON_TYPE_ICONS: Record<LessonType, string> = {
  NONE: 'i-lucide-minus',
  LECTURE: 'i-lucide-presentation',
  PRACTICE: 'i-lucide-code-xml',
}

const searchQuery = ref('')

interface AttendanceRow {
  studentId: string
  username: string
  [lessonId: string]: string | number
}

const filteredLessons = computed(() => {
  const d = props.data
  if (!d)
    return []
  if (props.activeType === 'ALL')
    return d.lessons
  return d.lessons.filter(l => l.type === props.activeType)
})

const rows = computed<AttendanceRow[]>(() => {
  const d = props.data
  if (!d)
    return []

  let students = d.students
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    students = students.filter(s => s.username.toLowerCase().includes(q))
  }

  return students.map((student) => {
    const row: AttendanceRow = {
      studentId: student.id,
      username: student.username,
    }
    for (const lesson of filteredLessons.value) {
      const att = d.attendances.find(
        a => a.studentId === student.id && a.lessonId === lesson.lessonId,
      )
      row[lesson.lessonId] = att?.presence ?? 'NONE'
    }
    return row
  })
})

const stats = computed(() => {
  const lessons = filteredLessons.value
  const students = rows.value
  if (lessons.length === 0 || students.length === 0)
    return null

  let present = 0
  let late = 0
  const total = lessons.length * students.length

  for (const student of students) {
    for (const lesson of lessons) {
      const p = (student[lesson.lessonId] as PresenceType) ?? 'NONE'
      if (p === 'PRESENT')
        present++
      else if (p === 'LATE')
        late++
    }
  }

  const attended = present + late
  const pct = total > 0 ? Math.round((attended / total) * 100) : null
  const color = pct === null ? 'neutral' : pct >= 80 ? 'success' : pct >= 60 ? 'warning' : 'error'

  return { studentCount: students.length, lessonCount: lessons.length, attended, total, pct, color }
})

interface LessonSummary {
  present: number
  late: number
  notPresent: number
  none: number
}

const lessonSummaries = computed<Record<string, LessonSummary>>(() => {
  const d = props.data
  const result: Record<string, LessonSummary> = {}
  if (!d)
    return result

  for (const lesson of filteredLessons.value) {
    const summary: LessonSummary = { present: 0, late: 0, notPresent: 0, none: 0 }
    for (const student of d.students) {
      const att = d.attendances.find(
        a => a.studentId === student.id && a.lessonId === lesson.lessonId,
      )
      const presence = att?.presence ?? 'NONE'
      switch (presence) {
        case 'PRESENT': {
          summary.present++
          break
        }
        case 'LATE': {
          summary.late++
          break
        }
        case 'NOT_PRESENT': {
          summary.notPresent++
          break
        }
        default: {
          summary.none++
          break
        }
      }
    }
    result[lesson.lessonId] = summary
  }
  return result
})

function getLessonSummary(lessonId: string): LessonSummary {
  return lessonSummaries.value[lessonId] ?? { present: 0, late: 0, notPresent: 0, none: 0 }
}

const upsertPending = ref<Set<string>>(new Set())

async function onSetAttendance(lessonId: string, studentId: string, presence: PresenceType) {
  const key = `${lessonId}:${studentId}`
  if (upsertPending.value.has(key))
    return
  upsertPending.value.add(key)
  const { error } = await upsertLessonAttendance(lessonId, {
    studentId,
    presence,
    note: null,
  })
  upsertPending.value.delete(key)
  if (error.value) {
    toastError(error.value, 'Не удалось обновить посещаемость')
  }
  else {
    emit('refresh')
  }
}

function lessonDateLabel(dateTime: string | null): string {
  if (!dateTime)
    return '—'
  return new Date(dateTime).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

const summaryColumn = computed<TableColumn<AttendanceRow>>(() => ({
  accessorKey: '__summary',
  header: () => h('div', { class: 'text-center text-xs font-medium' }, 'Итого'),
  footer: () => {
    const s = stats.value
    if (!s)
      return h('span', { class: 'text-xs text-muted' }, '—')
    return h('div', { class: 'flex flex-col items-center gap-0.5' }, [
      h(UBadge, { color: s.color, variant: 'subtle', size: 'sm', label: s.pct !== null ? `${s.pct}%` : '—' }),
      h('span', { class: 'text-[10px] text-muted' }, `${s.attended}/${s.total}`),
    ])
  },
  meta: {
    class: {
      th: 'w-20 min-w-20 sticky right-0 bg-default z-20 text-center',
      td: 'w-20 min-w-20 sticky right-0 bg-default z-10',
    },
  },
  cell: ({ row }) => {
    const lessons = filteredLessons.value
    let present = 0
    let late = 0
    for (const lesson of lessons) {
      const p = (row.original[lesson.lessonId] as PresenceType) ?? 'NONE'
      if (p === 'PRESENT')
        present++
      else if (p === 'LATE')
        late++
    }
    const total = lessons.length
    const attended = present + late
    const pct = total > 0 ? Math.round((attended / total) * 100) : null
    const color = pct === null ? 'neutral' : pct >= 80 ? 'success' : pct >= 60 ? 'warning' : 'error'

    return h('div', { class: 'flex flex-col items-center gap-0.5 py-1' }, [
      h(UBadge, { color, variant: 'subtle', size: 'sm', label: pct !== null ? `${pct}%` : '—' }),
      h('span', { class: 'text-[10px] text-muted' }, `${attended}/${total}`),
    ])
  },
}))

const lessonColumns = computed<TableColumn<AttendanceRow>[]>(() => {
  const d = props.data
  if (!d)
    return []
  return filteredLessons.value.map(lesson => ({
    accessorKey: lesson.lessonId,
    header: () => h('div', { class: 'flex flex-col items-center gap-0.5' }, [
      h('div', { class: 'flex items-center gap-1' }, [
        h(UIcon, { name: LESSON_TYPE_ICONS[lesson.type as LessonType] ?? 'i-lucide-minus', class: 'size-3 text-muted shrink-0' }),
        h('span', { class: 'text-xs font-medium truncate max-w-16' }, lesson.lessonName),
      ]),
      h('span', { class: 'text-[10px] text-muted' }, lessonDateLabel(lesson.dateTime)),
    ]),
    footer: () => {
      const summary = getLessonSummary(lesson.lessonId)
      const total = d.students.length
      const items = [
        summary.present > 0
          ? h(UBadge, { color: 'success', variant: 'subtle', size: 'sm', icon: 'i-lucide-check', label: summary.present })
          : null,
        summary.late > 0
          ? h(UBadge, { color: 'warning', variant: 'subtle', size: 'sm', icon: 'i-lucide-clock', label: summary.late })
          : null,
        summary.notPresent > 0
          ? h(UBadge, { color: 'error', variant: 'subtle', size: 'sm', icon: 'i-lucide-x', label: summary.notPresent })
          : null,
        summary.none > 0
          ? h(UBadge, { color: 'neutral', variant: 'subtle', size: 'sm', icon: 'i-lucide-minus', label: summary.none })
          : null,
      ].filter(Boolean)

      return h('div', { class: 'flex flex-col items-center gap-1' }, [
        h('div', { class: 'flex items-center gap-1.5' }, items),
        h('span', { class: 'text-[10px] text-muted' }, `${total} чел.`),
      ])
    },
    meta: { class: { th: 'w-20 text-center', td: 'w-20 text-center px-1 py-1' } },
    cell: ({ row }) => {
      const presence = (row.original[lesson.lessonId] as PresenceType) ?? 'NONE'
      const meta = PRESENCE_META[presence]
      const isPending = upsertPending.value.has(`${lesson.lessonId}:${row.original.studentId}`)

      const dropdownItems: DropdownMenuItem[][] = [[
        ...PRESENCE_TYPES.map(type => ({
          label: PRESENCE_META[type].label,
          icon: PRESENCE_META[type].icon,
          type: 'checkbox' as const,
          checked: presence === type,
          disabled: isPending,
          onSelect: (e: Event) => {
            e.preventDefault()
            if (presence !== type) {
              onSetAttendance(lesson.lessonId, row.original.studentId as string, type)
            }
          },
        })),
      ]]

      return h('div', { class: 'flex h-full w-full items-center justify-center' }, [
        h(UDropdownMenu, {
          items: dropdownItems,
          content: { align: 'center', side: 'bottom', sideOffset: 4 },
        }, {
          default: () => h(UButton, {
            icon: meta.icon,
            color: meta.color,
            variant: presence === 'NONE' ? 'ghost' : 'soft',
            size: 'sm',
            square: true,
            loading: isPending,
            disabled: isPending,
          }),
        }),
      ])
    },
  }))
})

const columns = computed<TableColumn<AttendanceRow>[]>(() => [
  {
    accessorKey: 'username',
    header: 'Студент',
    footer: 'Итого',
    meta: {
      class: {
        th: 'w-48 min-w-48 sticky left-0 bg-default z-20',
        td: 'w-48 min-w-48 sticky left-0 bg-default z-10',
      },
    },
  },
  ...lessonColumns.value,
  summaryColumn.value,
])
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center gap-3">
      <UInput
        v-model="searchQuery"
        placeholder="Поиск студентов..."
        icon="i-lucide-search"
        color="neutral"
        variant="outline"
        class="w-full sm:w-80"
      />
      <div v-if="stats" class="flex items-center gap-3 text-sm text-muted sm:ml-auto">
        <span>{{ stats.studentCount }} студ.</span>
        <span>{{ stats.lessonCount }} зан.</span>
        <UBadge
          v-if="stats.pct !== null"
          :color="stats.color"
          variant="subtle"
          size="sm"
          :label="`${stats.pct}% посещаемость`"
        />
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-3 text-sm text-muted">
      <UBadge color="success" variant="subtle" size="sm" icon="i-lucide-check" label="Присутствовал" />
      <UBadge color="warning" variant="subtle" size="sm" icon="i-lucide-clock" label="Опоздание" />
      <UBadge color="error" variant="subtle" size="sm" icon="i-lucide-x" label="Отсутствовал" />
      <UBadge color="neutral" variant="subtle" size="sm" icon="i-lucide-minus" label="Не отмечено" />
      <span class="ml-auto text-xs">Нажмите на ячейку для выбора статуса</span>
    </div>

    <div class="overflow-x-auto rounded-md border border-default">
      <UTable
        :data="rows"
        :columns="columns"
        :loading="loading"
        sticky
        class="min-w-max"
      >
        <template #empty>
          <UEmpty
            icon="i-lucide-calendar-x"
            title="Данные посещаемости отсутствуют"
            description="Отметки появятся после проведения занятий."
            variant="naked"
            class="py-12"
          />
        </template>
      </UTable>
    </div>
  </div>
</template>
