<script setup lang="ts">
import type { PresenceType } from '#shared/types/backend'
import type { TableColumn } from '@nuxt/ui'
import { h, resolveComponent } from 'vue'
import { useAttendanceApi } from '~/composables/api/useAttendanceApi'

const route = useRoute()
const subjectId = computed(() => String(route.params.subjectId ?? ''))

const { findBySubject, upsertByLesson } = useAttendanceApi()
const { data, pending, error, refresh } = findBySubject(subjectId)
const toast = useToast()

const UIcon = resolveComponent('UIcon')

const PRESENCE_CYCLE: PresenceType[] = ['NONE', 'PRESENT', 'LATE', 'NOT_PRESENT']

const PRESENCE_META: Record<
  PresenceType,
  { icon: string, label: string, colorClass: string, bgClass: string }
> = {
  NONE: {
    icon: 'i-lucide-minus',
    label: 'Не отмечено',
    colorClass: 'text-muted',
    bgClass: 'bg-transparent hover:bg-elevated/50',
  },
  PRESENT: {
    icon: 'i-lucide-check',
    label: 'Присутствовал',
    colorClass: 'text-success',
    bgClass: 'bg-success/10 hover:bg-success/20',
  },
  LATE: {
    icon: 'i-lucide-clock',
    label: 'Опоздание',
    colorClass: 'text-warning',
    bgClass: 'bg-warning/10 hover:bg-warning/20',
  },
  NOT_PRESENT: {
    icon: 'i-lucide-x',
    label: 'Отсутствовал',
    colorClass: 'text-error',
    bgClass: 'bg-error/10 hover:bg-error/20',
  },
}

const searchQuery = ref('')

const tableData = computed(() => data.value)

interface AttendanceRow {
  studentId: string
  username: string
  [lessonId: string]: string | number
}

const rows = computed<AttendanceRow[]>(() => {
  const d = tableData.value
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
    for (const lesson of d.lessons) {
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
  const d = tableData.value
  const result: Record<string, LessonSummary> = {}
  if (!d)
    return result

  for (const lesson of d.lessons) {
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
  const idx = PRESENCE_CYCLE.indexOf(current)
  if (idx === -1)
    return 'NONE'
  return PRESENCE_CYCLE[(idx + 1) % PRESENCE_CYCLE.length]!
}

async function onToggleAttendance(lessonId: string, studentId: string, current: PresenceType) {
  const key = `${lessonId}:${studentId}`
  if (upsertPending.value.has(key))
    return
  const next = nextPresence(current)
  upsertPending.value.add(key)
  try {
    const { error: err } = await upsertByLesson(lessonId, {
      studentId,
      presence: next,
      note: null,
    })
    if (err.value)
      throw err.value
    await refresh()
  }
  catch (e: unknown) {
    toast.add({
      title: 'Ошибка',
      description: e instanceof Error ? e.message : 'Не удалось обновить посещаемость',
      color: 'error',
    })
  }
  finally {
    upsertPending.value.delete(key)
  }
}

function lessonDateLabel(dateTime: string | null): string {
  if (!dateTime)
    return '—'
  return new Date(dateTime).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

const lessonColumns = computed<TableColumn<AttendanceRow>[]>(() => {
  const d = tableData.value
  if (!d)
    return []
  return d.lessons.map(lesson => ({
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
          ? h('span', { class: 'inline-flex items-center gap-0.5 text-[10px] font-medium text-success', title: 'Присутствовали' }, [
              h(UIcon, { name: 'i-lucide-check', class: 'size-3' }),
              summary.present,
            ])
          : null,
        summary.late > 0
          ? h('span', { class: 'inline-flex items-center gap-0.5 text-[10px] font-medium text-warning', title: 'Опоздали' }, [
              h(UIcon, { name: 'i-lucide-clock', class: 'size-3' }),
              summary.late,
            ])
          : null,
        summary.notPresent > 0
          ? h('span', { class: 'inline-flex items-center gap-0.5 text-[10px] font-medium text-error', title: 'Отсутствовали' }, [
              h(UIcon, { name: 'i-lucide-x', class: 'size-3' }),
              summary.notPresent,
            ])
          : null,
        summary.none > 0
          ? h('span', { class: 'inline-flex items-center gap-0.5 text-[10px] font-medium text-muted', title: 'Не отмечено' }, [
              h(UIcon, { name: 'i-lucide-minus', class: 'size-3' }),
              summary.none,
            ])
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
      return h('div', {
        class: ['flex h-full w-full items-center justify-center transition-colors', meta.bgClass, isPending && 'opacity-50'],
      }, [
        h('button', {
          class: 'inline-flex h-8 w-8 items-center justify-center rounded-md transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          title: meta.label,
          disabled: isPending,
          onClick: () => onToggleAttendance(lesson.lessonId, row.original.studentId, presence),
        }, [
          h(UIcon, { name: meta.icon, class: ['size-4', meta.colorClass] }),
        ]),
      ])
    },
  }))
})

const columns = computed<TableColumn<AttendanceRow>[]>(() => [
  {
    accessorKey: 'username',
    header: 'Студент',
    footer: 'Итого',
    meta: { class: { th: 'w-48 min-w-48 sticky left-0 bg-default z-10', td: 'w-48 min-w-48 sticky left-0 bg-default z-10' } },
  },
  ...lessonColumns.value,
])
</script>

<template>
  <section class="flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold">
        Посещаемость
      </h1>
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-lucide-refresh-cw"
        :loading="pending"
        @click="() => refresh()"
      />
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <UInput
        v-model="searchQuery"
        placeholder="Поиск студентов..."
        icon="i-lucide-search"
        color="neutral"
        variant="outline"
        class="w-full sm:w-80"
      />
    </div>

    <div class="flex flex-wrap items-center gap-4 text-sm text-muted">
      <span class="flex items-center gap-1.5">
        <span class="inline-flex h-5 w-5 items-center justify-center rounded bg-success/10">
          <UIcon name="i-lucide-check" class="size-3.5 text-success" />
        </span>
        Присутствовал
      </span>
      <span class="flex items-center gap-1.5">
        <span class="inline-flex h-5 w-5 items-center justify-center rounded bg-warning/10">
          <UIcon name="i-lucide-clock" class="size-3.5 text-warning" />
        </span>
        Опоздание
      </span>
      <span class="flex items-center gap-1.5">
        <span class="inline-flex h-5 w-5 items-center justify-center rounded bg-error/10">
          <UIcon name="i-lucide-x" class="size-3.5 text-error" />
        </span>
        Отсутствовал
      </span>
      <span class="flex items-center gap-1.5">
        <span class="inline-flex h-5 w-5 items-center justify-center rounded bg-elevated/50">
          <UIcon name="i-lucide-minus" class="size-3.5 text-muted" />
        </span>
        Не отмечено
      </span>
      <span class="ml-auto text-xs">Кликните по ячейке, чтобы изменить статус</span>
    </div>

    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      icon="i-lucide-circle-x"
      title="Ошибка загрузки"
      :description="error.message"
    />

    <div class="overflow-x-auto rounded-md border border-default">
      <UTable
        :data="rows"
        :columns="columns"
        :loading="pending"
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
  </section>
</template>
