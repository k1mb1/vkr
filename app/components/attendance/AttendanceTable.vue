<script setup lang="ts">
import type { PresenceType, SubjectAttendanceResponse } from '#shared/types/backend'
import type { TableColumn } from '@nuxt/ui'
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

function nextPresence(current: PresenceType): PresenceType {
  const idx = PRESENCE_TYPES.indexOf(current)
  if (idx === -1)
    return 'NONE'
  return PRESENCE_TYPES[(idx + 1) % PRESENCE_TYPES.length]!
}

async function onToggleAttendance(lessonId: string, studentId: string, current: PresenceType) {
  const key = `${lessonId}:${studentId}`
  if (upsertPending.value.has(key))
    return
  const next = nextPresence(current)
  upsertPending.value.add(key)
  const { error } = await upsertLessonAttendance(lessonId, {
    studentId,
    presence: next,
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

const lessonColumns = computed<TableColumn<AttendanceRow>[]>(() => {
  const d = props.data
  if (!d)
    return []
  return filteredLessons.value.map(lesson => ({
    accessorKey: lesson.lessonId,
    header: () => h('div', { class: 'flex flex-col items-center gap-0.5' }, [
      h('span', { class: 'text-xs font-medium' }, lesson.lessonName),
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
      return h('div', { class: 'flex h-full w-full items-center justify-center' }, [
        h(UButton, {
          icon: meta.icon,
          color: meta.color,
          variant: presence === 'NONE' ? 'ghost' : 'soft',
          size: 'sm',
          square: true,
          title: meta.label,
          loading: isPending,
          disabled: isPending,
          onClick: () => onToggleAttendance(lesson.lessonId, row.original.studentId, presence),
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
])
</script>

<template>
  <div class="flex flex-col gap-4">
    <UInput
      v-model="searchQuery"
      placeholder="Поиск студентов..."
      icon="i-lucide-search"
      color="neutral"
      variant="outline"
      class="w-full sm:w-80"
    />

    <div class="flex flex-wrap items-center gap-4 text-sm text-muted">
      <UBadge color="success" variant="subtle" size="sm" icon="i-lucide-check" label="Присутствовал" />
      <UBadge color="warning" variant="subtle" size="sm" icon="i-lucide-clock" label="Опоздание" />
      <UBadge color="error" variant="subtle" size="sm" icon="i-lucide-x" label="Отсутствовал" />
      <UBadge color="neutral" variant="subtle" size="sm" icon="i-lucide-minus" label="Не отмечено" />
      <span class="ml-auto text-xs">Кликните по ячейке, чтобы изменить статус</span>
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
