<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'
import type { TableColumn } from '@nuxt/ui'
import type { FetchError } from 'ofetch'

type GradingTableStudent = components['schemas']['GradingTableStudent']
type GradingTableLesson = components['schemas']['GradingTableLesson']
type AssignmentResponse = components['schemas']['AssignmentResponse']
type GradeCellResponse = components['schemas']['GradeCellResponse']
type UpsertGradeRequest = components['schemas']['UpsertGradeRequest']
type LessonType = NonNullable<GradingTableLesson['type']>

const route = useRoute()
const subjectId = computed(() => String(route.params.uuid ?? ''))

const { permission, scopes, permissionId, pending: permissionPending } = usePermissions()

const { data, pending: tablePending, error, refresh } = useBackend('/api/grades', {
  method: 'GET',
  query: computed(() => ({ permissionId: permissionId.value })),
  immediate: false,
})

watch(permissionId, (pid) => {
  if (pid)
    refresh()
}, { immediate: true })

const pending = computed(() => permissionPending.value || tablePending.value)

const students = computed<GradingTableStudent[]>(() => {
  const arr = [...(data.value?.students ?? [])]
  arr.sort((a, b) => (a.username ?? '').localeCompare(b.username ?? '', 'ru'))
  return arr
})

const lessons = computed<GradingTableLesson[]>(() => {
  const arr = [...(data.value?.lessons ?? [])]
  arr.sort((a, b) => {
    const at = a.startedAt ? new Date(a.startedAt).getTime() : 0
    const bt = b.startedAt ? new Date(b.startedAt).getTime() : 0
    return at - bt
  })
  return arr
})

const lessonById = computed(() => {
  const map = new Map<string, GradingTableLesson>()
  for (const l of lessons.value) {
    if (l.id)
      map.set(l.id, l)
  }
  return map
})

const assignmentsByLesson = computed<Map<string, AssignmentResponse[]>>(() => {
  const map = new Map<string, AssignmentResponse[]>()
  for (const a of data.value?.assignments ?? []) {
    if (!a.lessonId)
      continue
    const list = map.get(a.lessonId) ?? []
    list.push(a)
    map.set(a.lessonId, list)
  }
  for (const list of map.values()) {
    list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  }
  return map
})

const gradeByKey = computed<Map<string, GradeCellResponse>>(() => {
  const map = new Map<string, GradeCellResponse>()
  for (const g of data.value?.grades ?? []) {
    if (!g.studentId || !g.lessonId)
      continue
    const key = g.assignmentId
      ? `${g.studentId}:${g.assignmentId}`
      : `${g.studentId}:${g.lessonId}:extra`
    map.set(key, g)
  }
  return map
})

function getGrade(studentId?: string, assignmentId?: string): GradeCellResponse | undefined {
  if (!studentId || !assignmentId)
    return undefined
  return gradeByKey.value.get(`${studentId}:${assignmentId}`)
}

function getExtraGrade(studentId?: string, lessonId?: string): GradeCellResponse | undefined {
  if (!studentId || !lessonId)
    return undefined
  return gradeByKey.value.get(`${studentId}:${lessonId}:extra`)
}

interface StudentGroup {
  key: string
  label: string
  students: GradingTableStudent[]
}

const studentGroups = computed<StudentGroup[]>(() => {
  const hasMultipleGroups = new Set(students.value.map(s => s.groupId)).size > 1

  const grouped = new Map<string, GradingTableStudent[]>()
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

const lessonTypeLabel: Record<LessonType, string> = {
  LECTURE: 'Лекция',
  PRACTICE: 'Практика',
}

function formatLessonDate(lesson: GradingTableLesson): string {
  if (!lesson.startedAt)
    return '—'
  return new Intl.DateTimeFormat('ru', {
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(lesson.startedAt))
}

const columns = computed<TableColumn<GradingTableStudent>[]>(() => {
  const cols: TableColumn<GradingTableStudent>[] = [
    {
      accessorKey: 'username',
      header: 'Студент',
      meta: {
        class: {
          th: 'min-w-[220px]',
          td: 'min-w-[220px]',
        },
      },
    },
  ]

  for (const lesson of lessons.value) {
    if (!lesson.id)
      continue
    const assignments = assignmentsByLesson.value.get(lesson.id) ?? []
    const childCols: TableColumn<GradingTableStudent>[] = []

    for (const assignment of assignments) {
      if (!assignment.id)
        continue
      childCols.push({
        id: assignment.id,
        header: `№${assignment.order ?? ''}`,
        meta: {
          class: {
            th: 'min-w-[80px] text-center',
            td: 'min-w-[80px] text-center p-1',
          },
        },
      })
    }

    childCols.push({
      id: `extra-${lesson.id}`,
      header: 'Extra',
      meta: {
        class: {
          th: 'min-w-[80px] text-center',
          td: 'min-w-[80px] text-center p-1',
        },
      },
    })

    cols.push({
      id: `lesson-${lesson.id}`,
      header: lesson.topic || '—',
      columns: childCols,
      meta: {
        class: {
          th: 'text-center',
        },
      },
    })
  }

  return cols
})

const editOpen = ref(false)
const editStudent = ref<GradingTableStudent | null>(null)
const editLesson = ref<GradingTableLesson | null>(null)
const editAssignment = ref<AssignmentResponse | null>(null)
const editScore = ref<number | undefined>(undefined)
const editComment = ref('')
const saving = ref(false)

const { $backend } = useNuxtApp()
const { toastError } = useApiError()
const toast = useToast()

const maxScore = computed(() => editAssignment.value?.maxPoints ?? undefined)

function openCell(student: GradingTableStudent, lesson: GradingTableLesson, assignment?: AssignmentResponse) {
  if (!student.id || !lesson.id)
    return
  editStudent.value = student
  editLesson.value = lesson
  editAssignment.value = assignment ?? null
  if (assignment?.id) {
    const g = getGrade(student.id, assignment.id)
    editScore.value = g?.score ?? undefined
    editComment.value = g?.comment ?? ''
  }
  else {
    const g = getExtraGrade(student.id, lesson.id)
    editScore.value = g?.score ?? undefined
    editComment.value = g?.comment ?? ''
  }
  editOpen.value = true
}

function closeEdit() {
  editOpen.value = false
  editStudent.value = null
  editLesson.value = null
  editAssignment.value = null
  editScore.value = undefined
  editComment.value = ''
}

async function saveCell() {
  if (!editStudent.value?.id || !editLesson.value?.id || editScore.value == null)
    return

  if (editScore.value <= 0) {
    toast.add({ title: 'Балл должен быть больше 0', color: 'error', icon: 'i-lucide-circle-alert' })
    return
  }

  if (maxScore.value != null && editScore.value > maxScore.value) {
    toast.add({ title: `Максимум ${maxScore.value} баллов`, color: 'error', icon: 'i-lucide-circle-alert' })
    return
  }

  saving.value = true
  try {
    const body: UpsertGradeRequest = {
      studentId: editStudent.value.id,
      lessonId: editLesson.value.id,
      assignmentId: editAssignment.value?.id ?? undefined,
      score: editScore.value,
      comment: editComment.value.trim() || undefined,
    }
    await $backend('/api/grades', { method: 'PUT', body })
    toast.add({ title: 'Оценка сохранена', color: 'success', icon: 'i-lucide-check' })
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
    <UPageHeader title="Оценки">
      <template #links>
        <UButton
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="ghost"
          :loading="pending"
          @click="refresh()"
        />
        <UButton
          :to="`/dashboard/subjects/${subjectId}/assignments`"
          icon="i-lucide-clipboard-pen"
          color="neutral"
          variant="outline"
          label="Задания"
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
      <UEmpty
        v-if="!pending && (students.length === 0 || lessons.length === 0)"
        icon="i-lucide-clipboard-x"
        title="Нет данных"
        description="Для отображения оценок нужны и студенты, и занятия."
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
                :key="`${lesson.id}-group-header`"
                #[`lesson-${lesson.id}-header`]
              >
                <div class="flex flex-col items-center gap-1">
                  <UBadge
                    variant="soft"
                    :color="lesson.type === 'LECTURE' ? 'primary' : 'secondary'"
                    :label="lesson.type ? lessonTypeLabel[lesson.type] : '—'"
                  />
                  <span class="text-muted text-xs">{{ formatLessonDate(lesson) }}</span>
                  <span
                    v-if="lesson.topic"
                    class="line-clamp-1 max-w-[200px] text-xs"
                    :title="lesson.topic"
                  >
                    {{ lesson.topic }}
                  </span>
                </div>
              </template>

              <template
                v-for="assignment in data?.assignments ?? []"
                :key="`${assignment.id}-header`"
                #[`${assignment.id}-header`]
              >
                <div class="flex flex-col items-center gap-0.5">
                  <span class="text-xs font-medium">
                    №{{ assignment.order }}
                  </span>
                  <span class="text-muted text-[10px]">
                    max {{ assignment.maxPoints }}
                  </span>
                  <UIcon
                    v-if="assignment.required"
                    name="i-lucide-asterisk"
                    class="text-error size-3"
                  />
                </div>
              </template>

              <template
                v-for="assignment in data?.assignments ?? []"
                :key="`${assignment.id}-cell`"
                #[`${assignment.id}-cell`]="{ row }"
              >
                <UTooltip
                  :text="getGrade(row.original.id, assignment.id)?.comment || ''"
                  :disabled="!getGrade(row.original.id, assignment.id)?.comment"
                >
                  <UButton
                    v-if="getGrade(row.original.id, assignment.id)?.score != null"
                    block
                    variant="soft"
                    :color="assignment.required ? 'primary' : 'neutral'"
                    :label="String(getGrade(row.original.id, assignment.id)!.score)"
                    @click="openCell(row.original, lessonById.get(assignment.lessonId!)!, assignment)"
                  />
                  <UButton
                    v-else
                    block
                    variant="ghost"
                    :color="assignment.required ? 'error' : 'neutral'"
                    label="—"
                    @click="openCell(row.original, lessonById.get(assignment.lessonId!)!, assignment)"
                  />
                </UTooltip>
              </template>

              <template
                v-for="lesson in lessons"
                :key="`${lesson.id}-extra-header`"
                #[`extra-${lesson.id}-header`]
              >
                <span class="text-xs text-muted">Extra</span>
              </template>

              <template
                v-for="lesson in lessons"
                :key="`${lesson.id}-extra-cell`"
                #[`extra-${lesson.id}-cell`]="{ row }"
              >
                <UTooltip
                  :text="getExtraGrade(row.original.id, lesson.id)?.comment || ''"
                  :disabled="!getExtraGrade(row.original.id, lesson.id)?.comment"
                >
                  <UButton
                    v-if="getExtraGrade(row.original.id, lesson.id)?.score != null"
                    block
                    variant="soft"
                    color="warning"
                    :label="String(getExtraGrade(row.original.id, lesson.id)!.score)"
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
            </UTable>
          </ClientOnly>
        </section>
      </div>
    </div>

    <UModal
      :open="editOpen"
      :title="editAssignment ? 'Оценка за задание' : 'Дополнительная оценка'"
      @update:open="(v: boolean) => { if (!v && !saving) closeEdit() }"
    >
      <template #body="{ close }">
        <div class="flex flex-col gap-4">
          <p class="text-sm font-medium">
            {{ editStudent?.username ?? '—' }}
          </p>
          <p v-if="editLesson" class="text-muted text-sm">
            {{ editLesson.type ? lessonTypeLabel[editLesson.type] : '' }}
            · {{ formatLessonDate(editLesson) }}
            <span v-if="editLesson.topic">· {{ editLesson.topic }}</span>
          </p>
          <p v-if="editAssignment" class="text-muted text-sm">
            Задание №{{ editAssignment.order }} (max {{ editAssignment.maxPoints }} баллов)
            <span v-if="editAssignment.required" class="text-error">· обязательное</span>
          </p>

          <UFormField label="Балл" :hint="maxScore != null ? `макс ${maxScore}` : undefined">
            <UInput
              v-model.number="editScore"
              type="number"
              :min="1"
              :max="maxScore"
              class="w-full"
              :disabled="saving"
            />
          </UFormField>

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
              :disabled="saving || editScore == null"
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
