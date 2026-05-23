<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'
import type { TableColumn } from '@nuxt/ui'
import { useLocalStorage } from '@vueuse/core'

type AttendanceTableStudent = components['schemas']['AttendanceTableStudent']
type AttendanceTableLesson = components['schemas']['AttendanceTableLesson']
type AttendanceCellResponse = components['schemas']['AttendanceCellResponse']
type UpsertAttendanceRequest = components['schemas']['UpsertAttendanceRequest']
type AttendanceStatus = NonNullable<AttendanceCellResponse['status']>
type LessonType = NonNullable<AttendanceTableLesson['type']>

const route = useRoute()
const subjectId = computed(() => String(route.params.uuid ?? ''))

const { permission, scopes, permissionId, pending: permissionPending } = usePermissions()

const { data, pending: tablePending, error, refresh } = useBackend('/api/attendances', {
  method: 'GET',
  query: computed(() => ({ permissionId: permissionId.value })),
  immediate: false,
})

watch(permissionId, (pid) => {
  if (pid)
    refresh()
}, { immediate: true })

const pending = computed(() => permissionPending.value || tablePending.value)

const students = computed<AttendanceTableStudent[]>(() => {
  const arr = [...(data.value?.students ?? [])]
  arr.sort((a, b) => (a.username ?? '').localeCompare(b.username ?? '', 'ru'))
  return arr
})

const lessons = computed<AttendanceTableLesson[]>(() => {
  const arr = [...(data.value?.lessons ?? [])]
  arr.sort((a, b) => {
    const at = a.startedAt ? new Date(a.startedAt).getTime() : 0
    const bt = b.startedAt ? new Date(b.startedAt).getTime() : 0
    return at - bt
  })
  return arr
})

const cellMap = computed(() => {
  const map = new Map<string, AttendanceCellResponse>()
  for (const c of data.value?.attendances ?? []) {
    if (c.studentId && c.lessonId)
      map.set(`${c.studentId}:${c.lessonId}`, c)
  }
  return map
})

function getCell(studentId?: string, lessonId?: string): AttendanceCellResponse | undefined {
  if (!studentId || !lessonId)
    return undefined
  return cellMap.value.get(`${studentId}:${lessonId}`)
}

interface StudentGroup {
  key: string
  label: string
  students: AttendanceTableStudent[]
}

const studentGroups = computed<StudentGroup[]>(() => {
  const hasMultipleGroups = new Set(students.value.map(s => s.groupId)).size > 1

  const grouped = new Map<string, AttendanceTableStudent[]>()
  for (const s of students.value) {
    const key = `${s.groupId ?? '__none__'}:${s.subgroupId ?? '__none__'}`
    const bucket = grouped.get(key) ?? []
    bucket.push(s)
    grouped.set(key, bucket)
  }

  const result: StudentGroup[] = []
  for (const [key, list] of grouped) {
    const [, subgroupId] = key.split(':')
    const first = list[0]
    let label = ''

    if (hasMultipleGroups && first?.groupName) {
      label = first.groupName
    }

    if (subgroupId !== '__none__') {
      const idx = first?.subgroupIndex
      const subgroupLabel = idx != null ? `Подгруппа ${idx}` : 'Подгруппа'
      label = label ? `${label} · ${subgroupLabel}` : subgroupLabel
    }

    if (!label) {
      label = 'Без подгруппы'
    }

    result.push({ key, label, students: list })
  }

  result.sort((a, b) => {
    const aNoSubgroup = a.key.endsWith('__none__')
    const bNoSubgroup = b.key.endsWith('__none__')
    if (aNoSubgroup && !bNoSubgroup)
      return -1
    if (!aNoSubgroup && bNoSubgroup)
      return 1
    return a.label.localeCompare(b.label, 'ru')
  })

  return result
})

const STATUSES: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']

const statusLabel: Record<AttendanceStatus, string> = {
  PRESENT: 'Присутствовал',
  ABSENT: 'Отсутствовал',
  LATE: 'Опоздал',
  EXCUSED: 'Уваж. причина',
}

const statusShort: Record<AttendanceStatus, string> = {
  PRESENT: 'Б',
  ABSENT: 'Н',
  LATE: 'О',
  EXCUSED: 'У',
}

const statusColor: Record<AttendanceStatus, 'success' | 'error' | 'warning' | 'info'> = {
  PRESENT: 'success',
  ABSENT: 'error',
  LATE: 'warning',
  EXCUSED: 'info',
}

const lessonTypeLabel: Record<LessonType, string> = {
  LECTURE: 'Лекция',
  PRACTICE: 'Практика',
}

function formatLessonHeader(lesson: AttendanceTableLesson): string {
  if (!lesson.startedAt)
    return '—'
  return new Intl.DateTimeFormat('ru', {
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(lesson.startedAt))
}

// ── Settings (persisted) ─────────────────────────────────

interface AttendanceSettings {
  summaryCount: boolean
  summaryPercent: boolean
  footerCount: boolean
  footerPercent: boolean
  lateWeight: number
  excusedWeight: number
}

const settings = useLocalStorage<AttendanceSettings>('attendance:settings', {
  summaryCount: true,
  summaryPercent: true,
  footerCount: true,
  footerPercent: false,
  lateWeight: 0.5,
  excusedWeight: 1,
}, { mergeDefaults: true })

const showFooter = computed(() => settings.value.footerCount || settings.value.footerPercent)

function statusWeight(status: AttendanceStatus | undefined): number {
  if (status === 'PRESENT')
    return 1
  if (status === 'LATE')
    return settings.value.lateWeight
  if (status === 'EXCUSED')
    return settings.value.excusedWeight
  return 0
}

interface Stats { sum: number, total: number, percent: number }

function studentStats(studentId: string | undefined): Stats {
  if (!studentId)
    return { sum: 0, total: 0, percent: 0 }
  let sum = 0
  for (const lesson of lessons.value) {
    if (!lesson.id)
      continue
    const cell = getCell(studentId, lesson.id)
    sum += statusWeight(cell?.status as AttendanceStatus | undefined)
  }
  const total = lessons.value.length
  return { sum, total, percent: total ? (sum / total) * 100 : 0 }
}

function lessonStats(lessonId: string | undefined, list: AttendanceTableStudent[]): Stats {
  if (!lessonId)
    return { sum: 0, total: 0, percent: 0 }
  let sum = 0
  for (const s of list) {
    if (!s.id)
      continue
    const cell = getCell(s.id, lessonId)
    sum += statusWeight(cell?.status as AttendanceStatus | undefined)
  }
  const total = list.length
  return { sum, total, percent: total ? (sum / total) * 100 : 0 }
}

function groupStats(list: AttendanceTableStudent[]): Stats {
  let sum = 0
  let total = 0
  for (const s of list) {
    if (!s.id)
      continue
    const st = studentStats(s.id)
    sum += st.sum
    total += st.total
  }
  return { sum, total, percent: total ? (sum / total) * 100 : 0 }
}

function formatCount(n: number): string {
  return Number.isInteger(n) ? `${n}` : n.toFixed(1)
}

function formatPercent(n: number): string {
  return `${Math.round(n)}%`
}

const columns = computed<TableColumn<AttendanceTableStudent>[]>(() => {
  const withFooter = showFooter.value
  const base = withFooter ? { footer: '' } : {}

  const cols: TableColumn<AttendanceTableStudent>[] = [
    {
      accessorKey: 'username',
      header: 'Студент',
      meta: {
        class: {
          th: 'min-w-[220px]',
          td: 'min-w-[220px]',
        },
      },
      ...base,
    },
  ]

  for (const lesson of lessons.value) {
    if (!lesson.id)
      continue
    cols.push({
      id: lesson.id,
      meta: {
        class: {
          th: 'min-w-[120px] text-center',
          td: 'min-w-[120px] text-center p-1',
        },
      },
      ...base,
    })
  }

  if (settings.value.summaryCount) {
    cols.push({
      id: 'summaryCount',
      header: 'Кол-во',
      meta: {
        class: {
          th: 'min-w-[80px] text-center bg-elevated/50',
          td: 'min-w-[80px] text-center tabular-nums font-medium bg-elevated/30',
        },
      },
      ...base,
    })
  }

  if (settings.value.summaryPercent) {
    cols.push({
      id: 'summaryPercent',
      header: '%',
      meta: {
        class: {
          th: 'min-w-[80px] text-center bg-elevated/50',
          td: 'min-w-[80px] text-center tabular-nums font-medium bg-elevated/30',
        },
      },
      ...base,
    })
  }

  return cols
})

// ── Edit cell ────────────────────────────────────────────

const editOpen = ref(false)
const editStudent = ref<AttendanceTableStudent | null>(null)
const editLesson = ref<AttendanceTableLesson | null>(null)
const editStatus = ref<AttendanceStatus>('PRESENT')
const editComment = ref('')

const { $backend } = useNuxtApp()
const { loading: saving, submit } = useFormSubmit()

const statusItems = computed(() =>
  STATUSES.map(s => ({ value: s, label: statusLabel[s] })),
)

function openCell(student: AttendanceTableStudent, lesson: AttendanceTableLesson) {
  if (!student.id || !lesson.id)
    return
  editStudent.value = student
  editLesson.value = lesson
  const cell = getCell(student.id, lesson.id)
  editStatus.value = (cell?.status as AttendanceStatus | undefined) ?? 'PRESENT'
  editComment.value = cell?.comment ?? ''
  editOpen.value = true
}

function closeEdit() {
  editOpen.value = false
  editStudent.value = null
  editLesson.value = null
  editComment.value = ''
}

async function saveCell() {
  if (!editStudent.value?.id || !editLesson.value?.id)
    return

  await submit(
    () => {
      const body: UpsertAttendanceRequest = {
        studentId: editStudent.value!.id!,
        lessonId: editLesson.value!.id!,
        status: editStatus.value,
        comment: editComment.value.trim() || undefined,
      }
      return $backend('/api/attendances', { method: 'PUT', body })
    },
    {
      successMessage: 'Отметка сохранена',
      onSuccess: async () => {
        closeEdit()
        await refresh()
      },
    },
  )
}
</script>

<template>
  <div class="flex h-full flex-col gap-6">
    <UPageHeader title="Посещаемость">
      <template #links>
        <UPopover :ui="{ content: 'w-72' }">
          <UButton
            icon="i-lucide-settings-2"
            color="neutral"
            variant="outline"
            label="Настройки"
          />
          <template #content>
            <div class="p-4 flex flex-col gap-4">
              <div class="flex flex-col gap-2">
                <span class="text-xs uppercase tracking-wide text-muted font-medium">
                  Итог по студенту
                </span>
                <UCheckbox v-model="settings.summaryCount" label="Кол-во" />
                <UCheckbox v-model="settings.summaryPercent" label="Процент" />
              </div>
              <USeparator />
              <div class="flex flex-col gap-2">
                <span class="text-xs uppercase tracking-wide text-muted font-medium">
                  Итог по занятию (низ таблицы)
                </span>
                <UCheckbox v-model="settings.footerCount" label="Кол-во" />
                <UCheckbox v-model="settings.footerPercent" label="Процент" />
              </div>
              <USeparator />
              <div class="flex flex-col gap-2">
                <span class="text-xs uppercase tracking-wide text-muted font-medium">
                  Веса статусов
                </span>
                <p class="text-muted text-xs">
                  Присутствовал = 1, Отсутствовал = 0.
                </p>
                <UFormField label="Опоздал">
                  <UInput
                    v-model.number="settings.lateWeight"
                    type="number"
                    :min="0"
                    :max="1"
                    :step="0.1"
                    class="w-full"
                  />
                </UFormField>
                <UFormField label="Уваж. причина">
                  <UInput
                    v-model.number="settings.excusedWeight"
                    type="number"
                    :min="0"
                    :max="1"
                    :step="0.1"
                    class="w-full"
                  />
                </UFormField>
              </div>
            </div>
          </template>
        </UPopover>

        <UButton
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="ghost"
          :loading="pending"
          @click="refresh()"
        />
        <UButton
          :to="`/dashboard/subjects/${subjectId}/lessons`"
          icon="i-lucide-calendar"
          color="neutral"
          variant="outline"
          label="Занятия"
        />
      </template>
    </UPageHeader>

    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      title="Ошибка загрузки"
      :description="error.message"
    />

    <UAlert
      v-else-if="!permissionPending && (!permission || scopes.length === 0)"
      color="warning"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Нет назначения"
      description="У вас нет назначения по данному предмету."
    />

    <div v-else class="flex flex-col gap-3">
      <div class="text-muted flex flex-wrap items-center gap-3 text-sm">
        <span>Легенда:</span>
        <UBadge
          v-for="s in STATUSES"
          :key="s"
          variant="soft"
          :color="statusColor[s]"
          :label="`${statusShort[s]} · ${statusLabel[s]}`"
        />
      </div>

      <UEmpty
        v-if="!pending && (students.length === 0 || lessons.length === 0)"
        icon="i-lucide-clipboard-x"
        title="Нет данных"
        description="Для отображения посещаемости нужны и студенты, и занятия."
        variant="naked"
        class="py-10"
      />

      <div v-else class="flex flex-col gap-6">
        <section
          v-for="group in studentGroups"
          :key="group.key"
          class="flex flex-col gap-2"
        >
          <div class="flex items-center gap-2">
            <h3 class="text-default text-base font-semibold">
              {{ group.label }}
            </h3>
            <UBadge
              variant="subtle"
              color="neutral"
              :label="`${group.students.length}`"
            />
          </div>

          <ClientOnly>
            <UTable
              :data="group.students"
              :columns="columns"
              :loading="pending && group.students.length === 0"
              loading-color="primary"
              sticky
              class="max-h-[calc(100vh-18rem)]"
            >
              <template #username-cell="{ row }">
                <span :title="row.original.username ?? ''" class="line-clamp-1">
                  {{ row.original.username ?? '—' }}
                </span>
              </template>

              <template
                v-for="lesson in lessons"
                :key="`${lesson.id}-header`"
                #[`${lesson.id}-header`]
              >
                <div class="flex flex-col items-center gap-1">
                  <UBadge
                    variant="soft"
                    :color="lesson.type === 'LECTURE' ? 'primary' : 'secondary'"
                    :label="lesson.type ? lessonTypeLabel[lesson.type] : '—'"
                  />
                  <span class="text-muted text-xs">{{ formatLessonHeader(lesson) }}</span>
                  <span
                    v-if="lesson.topic"
                    class="line-clamp-1 max-w-[140px] text-xs"
                    :title="lesson.topic"
                  >
                    {{ lesson.topic }}
                  </span>
                </div>
              </template>

              <template
                v-for="lesson in lessons"
                :key="`${lesson.id}-cell`"
                #[`${lesson.id}-cell`]="{ row }"
              >
                <UTooltip
                  :text="getCell(row.original.id, lesson.id)?.comment || ''"
                  :disabled="!getCell(row.original.id, lesson.id)?.comment"
                >
                  <UButton
                    v-if="getCell(row.original.id, lesson.id)?.status"
                    block
                    variant="soft"
                    :color="statusColor[getCell(row.original.id, lesson.id)!.status as AttendanceStatus]"
                    :label="statusShort[getCell(row.original.id, lesson.id)!.status as AttendanceStatus]"
                    @click="openCell(row.original, lesson)"
                  />
                  <UButton
                    v-else
                    block
                    variant="ghost"
                    color="neutral"
                    label="—"
                    @click="openCell(row.original, lesson)"
                  />
                </UTooltip>
              </template>

              <!-- Summary columns (per student) -->
              <template #summaryCount-cell="{ row }">
                {{ formatCount(studentStats(row.original.id).sum) }}
                <span class="text-muted text-xs">
                  / {{ studentStats(row.original.id).total }}
                </span>
              </template>

              <template #summaryPercent-cell="{ row }">
                {{ formatPercent(studentStats(row.original.id).percent) }}
              </template>

              <!-- Footer cells -->
              <template v-if="showFooter" #username-footer>
                <span class="text-muted text-xs font-medium uppercase tracking-wide">
                  Итого
                </span>
              </template>

              <template
                v-for="lesson in lessons"
                :key="`${lesson.id}-footer`"
                #[`${lesson.id}-footer`]
              >
                <div class="flex flex-col items-center gap-0.5 text-xs tabular-nums">
                  <span v-if="settings.footerCount">
                    {{ formatCount(lessonStats(lesson.id, group.students).sum) }}
                    <span class="text-muted">
                      / {{ lessonStats(lesson.id, group.students).total }}
                    </span>
                  </span>
                  <span v-if="settings.footerPercent" class="text-muted">
                    {{ formatPercent(lessonStats(lesson.id, group.students).percent) }}
                  </span>
                </div>
              </template>

              <template v-if="settings.summaryCount" #summaryCount-footer>
                <span class="tabular-nums font-medium">
                  {{ formatCount(groupStats(group.students).sum) }}
                </span>
              </template>

              <template v-if="settings.summaryPercent" #summaryPercent-footer>
                <span class="tabular-nums font-medium">
                  {{ formatPercent(groupStats(group.students).percent) }}
                </span>
              </template>
            </UTable>
          </ClientOnly>
        </section>
      </div>
    </div>

    <UModal
      :open="editOpen"
      title="Отметка посещаемости"
      @update:open="(v: boolean) => { if (!v && !saving) closeEdit() }"
    >
      <template #body="{ close }">
        <div class="flex flex-col gap-4">
          <p class="text-sm font-medium">
            {{ editStudent?.username ?? '—' }}
          </p>
          <p v-if="editLesson" class="text-muted text-sm">
            {{ editLesson.type ? lessonTypeLabel[editLesson.type] : '' }}
            · {{ formatLessonHeader(editLesson) }}
            <span v-if="editLesson.topic">· {{ editLesson.topic }}</span>
          </p>

          <URadioGroup
            v-model="editStatus"
            :items="statusItems"
            :disabled="saving"
          />

          <UTextarea
            v-model="editComment"
            placeholder="Комментарий (необязательно)"
            :rows="3"
            :disabled="saving"
          />

          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="soft"
              :disabled="saving"
              @click="close()"
            >
              Отмена
            </UButton>
            <UButton
              icon="i-lucide-check"
              :loading="saving"
              :disabled="saving"
              @click="saveCell"
            >
              Сохранить
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
