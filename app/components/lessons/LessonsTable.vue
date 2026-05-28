<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import type { Cell } from '@tanstack/vue-table'
import type { components } from '#open-fetch-schemas/backend'

type LessonResponse = components['schemas']['LessonResponse']

const props = defineProps<{
  data: LessonResponse[]
  loading: boolean
  showType?: boolean
  subjectId: string
}>()

const emit = defineEmits<{
  refresh: []
}>()

function shouldSpan(lesson: LessonResponse) {
  return !lesson.scopes?.length || !!lesson.scopes[0]?.allGroups
}

const { hasAllPermissions } = usePermissions()

const columns = computed<TableColumn<LessonResponse>[]>(() => {
  const base: TableColumn<LessonResponse>[] = [
    { accessorKey: 'orderIndex', header: '№' },
    { accessorKey: 'topic', header: 'Тема' },
  ]
  if (props.showType !== false)
    base.push({ accessorKey: 'type', header: 'Тип' })
  base.push(
    {
      accessorKey: 'scopes',
      header: 'Группы',
      meta: {
        colspan: {
          td: (cell: Cell<LessonResponse, unknown>) =>
            shouldSpan(cell.row.original) ? '2' : '1',
        },
      },
    },
    {
      id: 'scopeDate',
      header: 'Дата',
      meta: {
        class: {
          td: (cell: Cell<LessonResponse, unknown>) =>
            shouldSpan(cell.row.original) ? 'hidden' : '',
        },
      },
    },
    { id: 'assignments', accessorKey: 'assignments', header: 'Задания' },
    { id: 'open', header: '' },
  )
  if (hasAllPermissions.value)
    base.push({ id: 'lessonActions', header: '' })
  return base
})

const { $backend } = useNuxtApp()
const { loading: deletingLesson, submit: submitDeleteLesson } = useFormSubmit()

const deleteLessonModal = ref(false)
const deleteLessonTarget = ref<LessonResponse | null>(null)

function openDeleteLessonModal(lesson: LessonResponse) {
  deleteLessonTarget.value = lesson
  deleteLessonModal.value = true
}

function closeDeleteLessonModal() {
  deleteLessonModal.value = false
  deleteLessonTarget.value = null
}

async function handleDeleteLesson() {
  if (!deleteLessonTarget.value?.id)
    return
  await submitDeleteLesson(
    () => $backend('/api/lessons/{id}', {
      method: 'DELETE',
      path: { id: deleteLessonTarget.value!.id! },
    }),
    {
      successMessage: 'Занятие удалено',
      onSuccess: () => {
        closeDeleteLessonModal()
        emit('refresh')
      },
    },
  )
}

const { loading: deletingAssignments, submit: submitDeleteAssignments } = useFormSubmit()
const deleteAssignmentsModal = ref(false)
const deleteAssignmentsTarget = ref<LessonResponse | null>(null)

function openDeleteAssignmentsModal(lesson: LessonResponse) {
  deleteAssignmentsTarget.value = lesson
  deleteAssignmentsModal.value = true
}

function closeDeleteAssignmentsModal() {
  deleteAssignmentsModal.value = false
  deleteAssignmentsTarget.value = null
}

async function handleDeleteAssignments() {
  if (!deleteAssignmentsTarget.value?.id)
    return
  await submitDeleteAssignments(
    () => $backend('/api/assignments/lessons/{lessonId}', {
      method: 'DELETE',
      path: { lessonId: deleteAssignmentsTarget.value!.id! },
    }),
    {
      successMessage: 'Задания удалены',
      onSuccess: () => {
        closeDeleteAssignmentsModal()
        emit('refresh')
      },
    },
  )
}

function lessonActions(lesson: LessonResponse): DropdownMenuItem[][] {
  return [
    [
      {
        label: 'Редактировать',
        icon: 'i-lucide-square-pen',
        onSelect: () => navigateTo({
          path: `/dashboard/subjects/${props.subjectId}/lessons/${lesson.id}/edit`,
          state: { lesson: JSON.parse(JSON.stringify(lesson)) },
        }),
      },
      ...(!lesson.scopes?.length
        ? [{
            label: 'Назначить проведение',
            icon: 'i-lucide-calendar-plus',
            onSelect: () => navigateTo(`/dashboard/subjects/${props.subjectId}/lessons/${lesson.id}/scopes-create`),
          }]
        : []),
      ...(!lesson.assignments?.length
        ? [{
            label: 'Добавить задания',
            icon: 'i-lucide-clipboard-list',
            onSelect: () => navigateTo({
              path: `/dashboard/subjects/${props.subjectId}/lessons/${lesson.id}/assignments-create`,
              state: { lesson: JSON.parse(JSON.stringify(lesson)) },
            }),
          }]
        : []),
    ],
    [
      ...(lesson.assignments?.length
        ? [{
            label: 'Удалить задания',
            icon: 'i-lucide-clipboard-x',
            color: 'error' as const,
            onSelect: () => openDeleteAssignmentsModal(lesson),
          }]
        : []),
      {
        label: 'Удалить занятие',
        icon: 'i-lucide-trash-2',
        color: 'error' as const,
        onSelect: () => openDeleteLessonModal(lesson),
      },
    ],
  ]
}
</script>

<template>
  <div>
    <UTable
      :data="data"
      :columns="columns"
      :loading="loading && data.length === 0"
      sticky
      class="w-full"
    >
      <!-- Тип -->
      <template #type-cell="{ row }">
        <UBadge
          :label="row.original.type === 'LECTURE' ? 'Лекция' : 'Практика'"
          :color="row.original.type === 'LECTURE' ? 'info' : 'success'"
          variant="subtle"
        />
      </template>

      <!-- Группы -->
      <template #scopes-cell="{ row }">
        <template v-if="shouldSpan(row.original)">
          <UBadge
            v-if="row.original.scopes?.[0]?.allGroups"
            label="Все группы"
            color="primary"
            variant="outline"
          />
          <span v-else class="text-sm text-muted">—</span>
        </template>

        <div v-else class="flex flex-col gap-1">
          <UBadge
            v-for="scope in row.original.scopes"
            :key="scope.id"
            :label="scope.allowedSubgroupIndex
              ? `${scope.groupName} / п.${scope.allowedSubgroupIndex}`
              : scope.groupName ?? ''"
            color="neutral"
            variant="subtle"
          />
        </div>
      </template>

      <!-- Дата -->
      <template #scopeDate-cell="{ row }">
        <div class="flex flex-col gap-1">
          <span
            v-for="scope in row.original.scopes"
            :key="scope.id"
            class="text-sm text-muted"
          >
            {{ scope.startedAt }}
          </span>
        </div>
      </template>

      <!-- Задания -->
      <template #assignments-cell="{ row }">
        <div v-if="row.original.assignments?.length" class="flex flex-wrap items-center gap-1">
          <UTooltip
            v-for="a in row.original.assignments"
            :key="a.id"
            :text="`№${a.order} · ${a.maxPoints} б · ${a.required ? 'обязательное' : 'необязательное'}`"
          >
            <UBadge
              :label="`№${a.order} · ${a.maxPoints}`"
              :color="a.required ? 'primary' : 'neutral'"
              :variant="a.required ? 'solid' : 'subtle'"
            />
          </UTooltip>
          <span class="text-xs text-muted">
            Σ {{ row.original.assignments.reduce((s, a) => s + (a.maxPoints ?? 0), 0) }}
          </span>
        </div>
        <span v-else class="text-sm text-muted">Нет</span>
      </template>

      <!-- Открыть -->
      <template #open-cell="{ row }">
        <UButton
          :to="`/dashboard/subjects/${subjectId}/lessons/${row.original.id}`"
          icon="i-lucide-external-link"
          color="neutral"
          variant="ghost"
          aria-label="Открыть"
        >
          Открыть
        </UButton>
      </template>

      <!-- Actions -->
      <template #lessonActions-cell="{ row }">
        <UDropdownMenu
          :items="lessonActions(row.original)"
          :ui="{ content: 'w-48' }"
        >
          <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" />
        </UDropdownMenu>
      </template>

      <template #empty>
        <UEmpty
          icon="i-lucide-calendar-off"
          title="Занятий пока нет"
          description="Добавьте занятия по количеству или расписанию"
          variant="naked"
          class="py-6"
        />
      </template>
    </UTable>

    <ConfirmModal
      :open="deleteLessonModal"
      title="Удалить занятие"
      :description="`Занятие «${deleteLessonTarget?.topic ?? `№${deleteLessonTarget?.orderIndex}`}» будет удалено безвозвратно.`"
      confirm-label="Удалить"
      confirm-color="error"
      confirm-icon="i-lucide-trash-2"
      :pending="deletingLesson"
      @close="closeDeleteLessonModal"
      @confirm="handleDeleteLesson"
    />

    <ConfirmModal
      :open="deleteAssignmentsModal"
      title="Удалить задания"
      :description="`Все задания занятия «${deleteAssignmentsTarget?.topic ?? `№${deleteAssignmentsTarget?.orderIndex}`}» (${deleteAssignmentsTarget?.assignments?.length ?? 0} шт.) будут удалены вместе со связанными оценками.`"
      confirm-label="Удалить"
      confirm-color="error"
      confirm-icon="i-lucide-clipboard-x"
      :pending="deletingAssignments"
      @close="closeDeleteAssignmentsModal"
      @confirm="handleDeleteAssignments"
    />
  </div>
</template>
