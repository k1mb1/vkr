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
const PRESENCE_ICONS: Record<PresenceType, string> = {
  NONE: 'i-lucide-minus',
  PRESENT: 'i-lucide-check',
  NOT_PRESENT: 'i-lucide-x',
  LATE: 'i-lucide-clock',
}
const PRESENCE_COLORS: Record<PresenceType, 'neutral' | 'success' | 'error' | 'warning'> = {
  NONE: 'neutral',
  PRESENT: 'success',
  NOT_PRESENT: 'error',
  LATE: 'warning',
}
const PRESENCE_ICON_CLASSES: Record<PresenceType, string> = {
  NONE: 'cursor-pointer size-5 text-muted',
  PRESENT: 'cursor-pointer size-5 text-success',
  NOT_PRESENT: 'cursor-pointer size-5 text-error',
  LATE: 'cursor-pointer size-5 text-warning',
}

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
  return d.students.map((student) => {
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

const lessonColumns = computed<TableColumn<AttendanceRow>[]>(() => {
  const d = tableData.value
  if (!d)
    return []
  return d.lessons.map(lesson => ({
    accessorKey: lesson.lessonId,
    header: () => h('div', { class: 'flex flex-col items-center gap-0.5' }, [
      h('span', { class: 'text-xs font-medium' }, lesson.lessonName),
      h('span', { class: 'text-[10px] text-muted' }, lesson.dateTime
        ? new Date(lesson.dateTime).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
        : '—'),
    ]),
    meta: { class: { th: 'w-20 text-center', td: 'w-20 text-center' } },
    cell: ({ row }) => {
      const presence = (row.original[lesson.lessonId] as PresenceType) ?? 'NONE'
      return h(UIcon, {
        name: PRESENCE_ICONS[presence],
        class: PRESENCE_ICON_CLASSES[presence],
        onClick: () => onToggleAttendance(lesson.lessonId, row.original.studentId, presence),
      })
    },
  }))
})

const columns = computed<TableColumn<AttendanceRow>[]>(() => [
  {
    accessorKey: 'username',
    header: 'Студент',
    meta: { class: { th: 'w-48 min-w-48 sticky left-0 bg-default z-10', td: 'w-48 min-w-48 sticky left-0 bg-default z-10' } },
  },
  ...lessonColumns.value,
])

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

    <div class="flex items-center gap-3 text-sm text-muted">
      <span class="flex items-center gap-1">
        <UIcon name="i-lucide-minus" class="size-4 text-muted" /> Не отмечено
      </span>
      <span class="flex items-center gap-1">
        <UIcon name="i-lucide-check" class="size-4 text-success" /> Присутствовал
      </span>
      <span class="flex items-center gap-1">
        <UIcon name="i-lucide-clock" class="size-4 text-warning" /> Опоздание
      </span>
      <span class="flex items-center gap-1">
        <UIcon name="i-lucide-x" class="size-4 text-error" /> Отсутствовал
      </span>
      <span class="ml-auto">Кликните по ячейке чтобы изменить статус</span>
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
