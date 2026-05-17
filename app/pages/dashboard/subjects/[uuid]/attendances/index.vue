<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'
import type { FetchError } from 'ofetch'

type AttendanceTableStudent = components['schemas']['AttendanceTableStudent']
type AttendanceTableLesson = components['schemas']['AttendanceTableLesson']
type AttendanceCellResponse = components['schemas']['AttendanceCellResponse']
type UpsertAttendanceRequest = components['schemas']['UpsertAttendanceRequest']
type AttendanceStatus = NonNullable<AttendanceCellResponse['status']>
type LessonType = NonNullable<AttendanceTableLesson['type']>

const route = useRoute()
const subjectId = computed(() => String(route.params.uuid ?? ''))

const { permission, pending: permissionPending } = usePermissions()
const permissionId = computed(() => permission.value?.id ?? '')
const groupId = computed(() => permission.value?.groupId ?? '')

const { data, pending: tablePending, error, refresh } = useBackend('/api/attendances', {
  method: 'GET',
  query: computed(() => ({ permissionId: permissionId.value })),
  immediate: false,
})

watch(permissionId, (id) => {
  if (id)
    refresh()
}, { immediate: true })

const { data: subgroupsData, refresh: refreshSubgroups } = useBackend('/api/subgroups', {
  method: 'GET',
  query: computed(() => ({ groupId: groupId.value })),
  immediate: false,
})

watch(groupId, (id) => {
  if (id)
    refreshSubgroups()
}, { immediate: true })

const subgroupIndexById = computed(() => {
  const map = new Map<string, number>()
  for (const s of subgroupsData.value ?? []) {
    if (s.id != null && s.index != null)
      map.set(s.id, s.index)
  }
  return map
})

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
  const grouped = new Map<string, AttendanceTableStudent[]>()
  for (const s of students.value) {
    const key = s.subgroupId ?? '__none__'
    const bucket = grouped.get(key) ?? []
    bucket.push(s)
    grouped.set(key, bucket)
  }

  const result: StudentGroup[] = []
  for (const [key, list] of grouped) {
    let label = 'Без подгруппы'
    if (key !== '__none__') {
      const idx = subgroupIndexById.value.get(key)
      label = idx != null ? `Подгруппа ${idx}` : 'Подгруппа'
    }
    result.push({ key, label, students: list })
  }
  result.sort((a, b) => {
    if (a.key === '__none__')
      return -1
    if (b.key === '__none__')
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

// ── Edit cell ────────────────────────────────────────────

const editOpen = ref(false)
const editStudent = ref<AttendanceTableStudent | null>(null)
const editLesson = ref<AttendanceTableLesson | null>(null)
const editStatus = ref<AttendanceStatus>('PRESENT')
const editComment = ref('')
const saving = ref(false)

const { $backend } = useNuxtApp()
const { toastError } = useApiError()
const toast = useToast()

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

  saving.value = true
  try {
    const body: UpsertAttendanceRequest = {
      studentId: editStudent.value.id,
      lessonId: editLesson.value.id,
      status: editStatus.value,
      comment: editComment.value.trim() || undefined,
    }
    await $backend('/api/attendances', { method: 'PUT', body })
    toast.add({ title: 'Отметка сохранена', color: 'success', icon: 'i-lucide-check' })
    closeEdit()
    await refresh()
  }
  catch (e) {
    toastError(e as FetchError)
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="flex h-full flex-col gap-6">
    <UPageHeader title="Посещаемость">
      <template #links>
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
      v-else-if="!permissionPending && !permission"
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

      <UCard v-if="pending && students.length === 0" :ui="{ body: 'p-6' }">
        <USkeleton class="h-40 w-full" />
      </UCard>

      <UEmpty
        v-else-if="students.length === 0 || lessons.length === 0"
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

          <div class="bg-default ring-default relative overflow-auto rounded-lg ring">
            <table class="w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <th
                    class="bg-elevated ring-default sticky left-0 top-0 z-30 min-w-[220px] px-3 py-2 text-left font-medium ring-1"
                  >
                    Студент
                  </th>
                  <th
                    v-for="lesson in lessons"
                    :key="lesson.id"
                    class="bg-elevated ring-default sticky top-0 z-20 min-w-[120px] px-2 py-2 text-center font-medium ring-1"
                  >
                    <div class="flex flex-col items-center gap-1">
                      <UBadge
                        variant="soft"
                        size="sm"
                        :color="lesson.type === 'LECTURE' ? 'primary' : 'secondary'"
                        :label="lesson.type ? lessonTypeLabel[lesson.type] : '—'"
                      />
                      <span class="text-muted text-xs">{{ formatLessonHeader(lesson) }}</span>
                      <span
                        v-if="lesson.topic"
                        class="line-clamp-1 max-w-[140px] text-xs"
                        :title="lesson.topic"
                      >{{ lesson.topic }}</span>
                    </div>
                  </th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="student in group.students"
                  :key="student.id"
                  class="hover:bg-elevated/50"
                >
                  <th class="bg-default ring-default sticky left-0 z-10 px-3 py-2 text-left font-normal ring-1">
                    <span class="line-clamp-1" :title="student.username ?? ''">{{ student.username ?? '—' }}</span>
                  </th>

                  <td
                    v-for="lesson in lessons"
                    :key="lesson.id"
                    class="ring-default p-1 text-center ring-1"
                  >
                    <UTooltip
                      :text="getCell(student.id, lesson.id)?.comment || ''"
                      :disabled="!getCell(student.id, lesson.id)?.comment"
                    >
                      <UButton
                        v-if="getCell(student.id, lesson.id)?.status"
                        block
                        size="xs"
                        variant="soft"
                        :color="statusColor[getCell(student.id, lesson.id)!.status as AttendanceStatus]"
                        :label="statusShort[getCell(student.id, lesson.id)!.status as AttendanceStatus]"
                        @click="openCell(student, lesson)"
                      />
                      <UButton
                        v-else
                        block
                        size="xs"
                        variant="ghost"
                        color="neutral"
                        label="—"
                        @click="openCell(student, lesson)"
                      />
                    </UTooltip>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
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
