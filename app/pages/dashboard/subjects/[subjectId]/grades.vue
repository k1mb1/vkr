<script setup lang="ts">
import type { FinalGradeResponse, StudentTaskGradesResponse, SubmissionStatus } from '#shared/types/backend'
import type { TableColumn } from '@nuxt/ui'
import { h, resolveComponent } from 'vue'
import { useSubjectsApi } from '~/composables/api/useSubjectsApi'

const route = useRoute()
const subjectId = computed(() => String(route.params.subjectId ?? ''))

const { findFinalGrades, findGrades } = useSubjectsApi()

const { data: finalGradesData, pending: finalPending, error: finalError, refresh: refreshFinal } = findFinalGrades(subjectId)
const { data: taskGradesData, pending: taskPending, error: taskError, refresh: refreshTasks } = findGrades(subjectId)

const activeTab = ref<'final' | 'tasks'>('final')

const tabs = computed(() => [
  { label: 'Итоговые баллы', value: 'final', icon: 'i-lucide-trophy' },
  { label: 'По заданиям', value: 'tasks', icon: 'i-lucide-list-checks' },
])

const UBadge = resolveComponent('UBadge')

// ── Final grades ──────────────────────────────────────────────────────────────

const finalGrades = computed<FinalGradeResponse[]>(() => finalGradesData.value ?? [])

const finalColumns: TableColumn<FinalGradeResponse>[] = [
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

// ── Task grades ───────────────────────────────────────────────────────────────

const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  NOT_SUBMITTED: 'Не сдано',
  SUBMITTED: 'Сдано',
  GRADED: 'Оценено',
  RESUBMIT: 'На доработку',
}

const SUBMISSION_STATUS_COLORS: Record<SubmissionStatus, string> = {
  NOT_SUBMITTED: 'neutral',
  SUBMITTED: 'info',
  GRADED: 'success',
  RESUBMIT: 'warning',
}

interface FlatGradeRow {
  username: string
  taskId: string
  status: SubmissionStatus
  value: number | null
  submittedAt: string | null
}

const flatTaskGrades = computed<FlatGradeRow[]>(() => {
  return (taskGradesData.value ?? []).flatMap((row: StudentTaskGradesResponse) =>
    row.grades.map(g => ({
      username: row.username,
      taskId: g.taskId,
      status: g.status,
      value: g.value,
      submittedAt: g.submittedAt,
    })),
  )
})

const taskColumns: TableColumn<FlatGradeRow>[] = [
  {
    accessorKey: 'username',
    header: 'Студент',
    meta: { class: { th: 'w-2/5', td: 'w-2/5' } },
  },
  {
    accessorKey: 'status',
    header: 'Статус',
    meta: { class: { th: 'w-36', td: 'w-36' } },
    cell: ({ row }) =>
      h(UBadge, {
        label: SUBMISSION_STATUS_LABELS[row.original.status],
        color: SUBMISSION_STATUS_COLORS[row.original.status],
        variant: 'soft',
        size: 'sm',
      }),
  },
  {
    accessorKey: 'value',
    header: 'Оценка',
    meta: { class: { th: 'w-24', td: 'w-24' } },
    cell: ({ row }) => {
      const val = row.original.value
      return h('span', val !== null ? String(val) : h('span', { class: 'text-muted' }, '—'))
    },
  },
  {
    accessorKey: 'submittedAt',
    header: 'Дата сдачи',
    meta: { class: { th: 'w-36', td: 'w-36' } },
    cell: ({ row }) => {
      const dt = row.original.submittedAt
      if (!dt)
        return h('span', { class: 'text-muted' }, '—')
      return h('span', new Date(dt).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }))
    },
  },
]
</script>

<template>
  <section class="flex flex-col gap-4">
    <div>
      <h1 class="text-xl font-semibold">
        Оценки
      </h1>
    </div>

    <UTabs
      v-model="activeTab"
      :items="tabs"
      :content="false"
    />

    <!-- Итоговые баллы -->
    <template v-if="activeTab === 'final'">
      <div class="flex items-center gap-3">
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-refresh-cw"
          :loading="finalPending"
          @click="() => refreshFinal()"
        />
      </div>

      <UAlert
        v-if="finalError"
        color="error"
        variant="soft"
        icon="i-lucide-circle-x"
        title="Ошибка загрузки"
        :description="finalError.message"
      />

      <UTable
        :data="finalGrades"
        :columns="finalColumns"
        :loading="finalPending"
        sticky
      >
        <template #empty>
          <UEmpty
            icon="i-lucide-trophy"
            title="Итоговые баллы отсутствуют"
            description="Данные появятся после выставления оценок за задания."
            variant="naked"
            class="py-12"
          />
        </template>
      </UTable>
    </template>

    <!-- По заданиям -->
    <template v-else-if="activeTab === 'tasks'">
      <div class="flex items-center gap-3">
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-refresh-cw"
          :loading="taskPending"
          @click="() => refreshTasks()"
        />
      </div>

      <UAlert
        v-if="taskError"
        color="error"
        variant="soft"
        icon="i-lucide-circle-x"
        title="Ошибка загрузки"
        :description="taskError.message"
      />

      <UTable
        :data="flatTaskGrades"
        :columns="taskColumns"
        :loading="taskPending"
        sticky
      >
        <template #empty>
          <UEmpty
            icon="i-lucide-list-checks"
            title="Оценки по заданиям отсутствуют"
            description="Данные появятся после выставления оценок."
            variant="naked"
            class="py-12"
          />
        </template>
      </UTable>
    </template>
  </section>
</template>
