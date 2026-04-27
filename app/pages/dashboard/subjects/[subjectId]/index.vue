<script setup lang="ts">
import type { StudentAttendanceTableResponse } from '#shared/types/backend'
import type { TableColumn } from '@nuxt/ui'
import { h, resolveComponent } from 'vue'
import { useAttendanceApi } from '~/composables/api/useAttendanceApi'
import { useSubjectsStore } from '~/stores/subjects'

const subjectsStore = useSubjectsStore()
const { findBySubject } = useAttendanceApi()
const route = useRoute()
const subjectId = computed(() => String(route.params.subjectId ?? ''))

const subject = computed(() =>
  subjectsStore.activeSubjects.find(s => s.id === subjectId.value)
  ?? subjectsStore.archivedSubjects.find(s => s.id === subjectId.value)
  ?? null,
)

const isSubjectLoading = computed(() =>
  subjectsStore.activeSubjectsPending || subjectsStore.archivedSubjectsPending,
)

const { data: attendanceData, pending: attendancePending, error: attendanceError, refresh: refreshAttendance } = findBySubject(subjectId)

const activeTab = ref<'overview' | 'attendance'>('overview')

const tabs = computed(() => [
  { label: 'Обзор', value: 'overview', icon: 'i-lucide-info' },
  { label: 'Посещения', value: 'attendance', icon: 'i-lucide-calendar-check' },
])

function formatDate(value: string | null): string {
  if (!value)
    return '—'
  return new Date(value).toLocaleString('ru-RU', { dateStyle: 'long', timeStyle: 'short' })
}

interface AttendanceRow {
  studentId: string
  username: string
  presentCount: number
  absentCount: number
  noneCount: number
  rate: string
}

const UBadge = resolveComponent('UBadge')

const attendanceRows = computed<AttendanceRow[]>(() => {
  return (attendanceData.value ?? []).map((row: StudentAttendanceTableResponse) => {
    const presentCount = row.attendances.filter(a => a.presence === 'PRESENT').length
    const absentCount = row.attendances.filter(a => a.presence === 'NOT_PRESENT').length
    const noneCount = row.attendances.filter(a => a.presence === 'NONE').length
    const denominator = presentCount + absentCount
    const rate = denominator > 0 ? `${Math.round((presentCount / denominator) * 100)}%` : '—'
    return { studentId: row.studentId, username: row.username, presentCount, absentCount, noneCount, rate }
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

    <!-- Обзор -->
    <template v-if="activeTab === 'overview'">
      <UCard>
        <template v-if="isSubjectLoading">
          <div class="flex flex-col gap-3">
            <USkeleton class="h-5 w-48" />
            <USkeleton class="h-4 w-80" />
            <USkeleton class="h-4 w-32" />
          </div>
        </template>

        <template v-else-if="subject">
          <dl class="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
            <div class="flex flex-col gap-1">
              <dt class="text-sm text-muted">
                Название
              </dt>
              <dd class="font-medium">
                {{ subject.name }}
              </dd>
            </div>

            <div class="flex flex-col gap-1">
              <dt class="text-sm text-muted">
                Статус
              </dt>
              <dd>
                <UBadge
                  :label="subject.archived ? 'Архивный' : 'Активный'"
                  :color="subject.archived ? 'neutral' : 'success'"
                  variant="soft"
                />
              </dd>
            </div>

            <div class="flex flex-col gap-1 sm:col-span-2">
              <dt class="text-sm text-muted">
                Описание
              </dt>
              <dd :class="subject.description ? '' : 'text-muted'">
                {{ subject.description ?? '—' }}
              </dd>
            </div>

            <div class="flex flex-col gap-1">
              <dt class="text-sm text-muted">
                Создан
              </dt>
              <dd class="text-sm">
                {{ formatDate(subject.createdAt) }}
              </dd>
            </div>

            <div class="flex flex-col gap-1">
              <dt class="text-sm text-muted">
                Обновлён
              </dt>
              <dd class="text-sm">
                {{ formatDate(subject.updatedAt) }}
              </dd>
            </div>

            <div v-if="subject.archived" class="flex flex-col gap-1">
              <dt class="text-sm text-muted">
                Архивирован
              </dt>
              <dd class="text-sm">
                {{ formatDate(subject.archivedAt) }}
              </dd>
            </div>
          </dl>
        </template>

        <template v-else>
          <UEmpty
            icon="i-lucide-book"
            title="Предмет не найден"
            variant="naked"
            class="py-8"
          />
        </template>
      </UCard>
    </template>

    <!-- Посещения -->
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
