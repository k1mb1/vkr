<script setup lang="ts">
import type { FinalGradeResponse, SubjectAttendanceResponse } from '#shared/types/backend'
import type { TableColumn } from '@nuxt/ui'
import { h, resolveComponent } from 'vue'
import { useAttendanceApi } from '~/composables/api/useAttendanceApi'
import { useSubjectsApi } from '~/composables/api/useSubjectsApi'

const { findBySubject } = useAttendanceApi()
const { findFinalGrades } = useSubjectsApi()
const route = useRoute()
const subjectId = computed(() => String(route.params.subjectId ?? ''))

const { data: attendanceData, pending: attendancePending, error: attendanceError, refresh: refreshAttendance } = findBySubject(subjectId)
const { data: gradesData, pending: gradesPending, error: gradesError, refresh: refreshGrades } = findFinalGrades(subjectId)

const activeTab = ref<'grades' | 'attendance'>('grades')

const tabs = computed(() => [
  { label: 'Оценки', value: 'grades', icon: 'i-lucide-trophy' },
  { label: 'Посещаемость', value: 'attendance', icon: 'i-lucide-calendar-check' },
])

const UBadge = resolveComponent('UBadge')

// ── Grades ────────────────────────────────────────────────────────────────────

const finalGrades = computed<FinalGradeResponse[]>(() => gradesData.value ?? [])

const gradesColumns: TableColumn<FinalGradeResponse>[] = [
  {
    accessorKey: 'username',
    header: 'Студент',
    meta: { class: { th: 'w-2/5', td: 'w-2/5' } },
  },
  {
    accessorKey: 'earnedPoints',
    header: 'Заработано',
    meta: { class: { th: 'w-32', td: 'w-32' } },
  },
  {
    accessorKey: 'maxPoints',
    header: 'Максимум',
    meta: { class: { th: 'w-32', td: 'w-32' } },
  },
  {
    accessorKey: 'percentage',
    header: '%',
    meta: { class: { th: 'w-24', td: 'w-24' } },
    cell: ({ row }) => {
      const pct = row.original.percentage
      if (pct === null)
        return h('span', { class: 'text-muted' }, '—')
      const color = pct >= 60 ? 'success' : pct >= 40 ? 'warning' : 'error'
      return h(UBadge, { label: `${pct.toFixed(1)}%`, color, variant: 'soft', size: 'sm' })
    },
  },
]

// ── Attendance ────────────────────────────────────────────────────────────────

interface AttendanceRow {
  studentId: string
  username: string
  presentCount: number
  absentCount: number
  noneCount: number
  rate: string
}

const attendanceRows = computed<AttendanceRow[]>(() => {
  const data = attendanceData.value
  if (!data)
    return []
  return data.students.map((student) => {
    const studentAttendances = data.attendances.filter(a => a.studentId === student.id)
    const presentCount = studentAttendances.filter(a => a.presence === 'PRESENT').length
    const absentCount = studentAttendances.filter(a => a.presence === 'NOT_PRESENT').length
    const noneCount = studentAttendances.filter(a => a.presence === 'NONE').length
    const denominator = presentCount + absentCount
    const rate = denominator > 0 ? `${Math.round((presentCount / denominator) * 100)}%` : '—'
    return { studentId: student.id, username: student.username, presentCount, absentCount, noneCount, rate }
  })
})

const attendanceColumns: TableColumn<AttendanceRow>[] = [
  {
    accessorKey: 'username',
    header: 'Студент',
    meta: { class: { th: 'w-2/5', td: 'w-2/5' } },
  },
  {
    accessorKey: 'presentCount',
    header: 'Присутствовал',
    meta: { class: { th: 'w-28 text-center', td: 'w-28 text-center' } },
    cell: ({ row }) =>
      h(UBadge, { label: String(row.original.presentCount), color: 'success', variant: 'soft', size: 'sm' }),
  },
  {
    accessorKey: 'absentCount',
    header: 'Отсутствовал',
    meta: { class: { th: 'w-28 text-center', td: 'w-28 text-center' } },
    cell: ({ row }) =>
      h(UBadge, { label: String(row.original.absentCount), color: 'error', variant: 'soft', size: 'sm' }),
  },
  {
    accessorKey: 'noneCount',
    header: 'Не отмечено',
    meta: { class: { th: 'w-28 text-center', td: 'w-28 text-center' } },
    cell: ({ row }) =>
      h(UBadge, { label: String(row.original.noneCount), color: 'neutral', variant: 'soft', size: 'sm' }),
  },
  {
    accessorKey: 'rate',
    header: '% посещаемости',
    meta: { class: { th: 'w-32 text-center', td: 'w-32 text-center' } },
  },
]
</script>

<template>
  <section class="flex flex-col gap-4">
    <div>
      <h1 class="text-xl font-semibold">
        Общее
      </h1>
    </div>

    <UTabs
      v-model="activeTab"
      :items="tabs"
      :content="false"
    />

    <!-- Оценки -->
    <template v-if="activeTab === 'grades'">
      <div class="flex items-center gap-3">
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-refresh-cw"
          :loading="gradesPending"
          @click="() => refreshGrades()"
        />
      </div>

      <UAlert
        v-if="gradesError"
        color="error"
        variant="soft"
        icon="i-lucide-circle-x"
        title="Ошибка загрузки"
        :description="gradesError.message"
      />

      <UTable
        :data="finalGrades"
        :columns="gradesColumns"
        :loading="gradesPending"
        sticky
      >
        <template #empty>
          <UEmpty
            icon="i-lucide-trophy"
            title="Итоговые баллы отсутствуют"
            description="Данные появятся после выставления оценок."
            variant="naked"
            class="py-12"
          />
        </template>
      </UTable>
    </template>

    <!-- Посещаемость -->
    <template v-else-if="activeTab === 'attendance'">
      <div class="flex items-center gap-3">
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-refresh-cw"
          :loading="attendancePending"
          @click="() => refreshAttendance()"
        />
      </div>

      <UAlert
        v-if="attendanceError"
        color="error"
        variant="soft"
        icon="i-lucide-circle-x"
        title="Ошибка загрузки"
        :description="attendanceError.message"
      />

      <UTable
        :data="attendanceRows"
        :columns="attendanceColumns"
        :loading="attendancePending"
        sticky
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
    </template>
  </section>
</template>
