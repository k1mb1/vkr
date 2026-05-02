<script setup lang="ts">
import type { LessonResponse, LessonType, SubjectLessonHeader, TaskResponse } from '#shared/types/backend'
import { LESSON_TYPES } from '#shared/types/backend'
import { useLessons } from '~/composables/api/useLessonsApi'
import { useSubjectGrades } from '~/composables/api/useSubjectsApi'

const route = useRoute()
const subjectId = computed(() => String(route.params.subjectId ?? ''))

const { data: gradesData, pending: gradesPending, error: gradesError, refresh: refreshGrades } = useSubjectGrades(subjectId)
const { data: lessonsData, pending: lessonsPending } = useLessons({ filter: { subjectId: subjectId.value } })

const tasksByLessonId = ref<Record<string, TaskResponse[]>>({})
const tasksLoading = ref(false)
const tasksError = ref<Error | null>(null)

watch([gradesData, lessonsData], async ([grades]) => {
  if (!grades?.lessons?.length) {
    tasksByLessonId.value = {}
    return
  }
  const lessonIds = grades.lessons.map(l => l.lessonId)
  tasksLoading.value = true
  tasksError.value = null
  try {
    const results = await Promise.all(
      lessonIds.map(async (lessonId) => {
        const tasks = await $fetch<TaskResponse[]>(`/api/proxy/lessons/${lessonId}/tasks`)
        return { lessonId, tasks: tasks ?? [] }
      }),
    )
    tasksByLessonId.value = Object.fromEntries(results.map(r => [r.lessonId, r.tasks]))
  }
  catch (e) {
    tasksError.value = e instanceof Error ? e : new Error('Failed to load tasks')
  }
  finally {
    tasksLoading.value = false
  }
}, { immediate: true })

const rawLessons = computed<LessonResponse[]>(() => {
  const val = lessonsData.value as any
  if (Array.isArray(val))
    return val
  if (val && Array.isArray(val.content))
    return val.content as LessonResponse[]
  return []
})

const lessonsMap = computed(() => {
  const map = new Map<string, LessonResponse>()
  for (const lesson of rawLessons.value) {
    map.set(lesson.id, lesson)
  }
  return map
})

// Lesson type filter
const activeType = ref<string>('ALL')

const LESSON_TYPE_LABELS: Record<LessonType, string> = {
  NONE: 'Без типа',
  LECTURE: 'Лекция',
  PRACTICE: 'Практика',
}

const LESSON_TYPE_ICONS: Record<LessonType, string> = {
  NONE: 'i-lucide-minus',
  LECTURE: 'i-lucide-presentation',
  PRACTICE: 'i-lucide-code',
}

const typeTabs = computed(() => {
  const lessons = gradesData.value?.lessons ?? []
  if (lessons.length === 0)
    return []

  const tabs = [
    { label: 'Все', value: 'ALL', icon: 'i-lucide-layout-grid', badge: lessons.length || undefined },
  ]

  for (const type of LESSON_TYPES) {
    const count = lessons.filter(l => l.type === type).length
    if (count > 0) {
      tabs.push({ label: LESSON_TYPE_LABELS[type], value: type, icon: LESSON_TYPE_ICONS[type], badge: count })
    }
  }

  return tabs
})

const filteredLessons = computed<SubjectLessonHeader[]>(() => {
  const lessons = gradesData.value?.lessons ?? []
  if (activeType.value === 'ALL')
    return lessons
  return lessons.filter(l => l.type === activeType.value)
})

// Table mode
type TableMode = 'summary' | 'tasks'
const tableMode = ref<TableMode>('summary')

const tableModeItems: Array<{ label: string, value: TableMode, icon: string }> = [
  { label: 'По занятиям', value: 'summary', icon: 'i-lucide-table-2' },
  { label: 'По заданиям', value: 'tasks', icon: 'i-lucide-clipboard-list' },
]

const pending = computed(() => gradesPending.value || lessonsPending.value || tasksLoading.value)
</script>

<template>
  <section class="flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold">
        Оценки
      </h1>
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-lucide-refresh-cw"
        :loading="pending"
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
    <UAlert
      v-if="tasksError"
      color="warning"
      variant="soft"
      icon="i-lucide-alert-triangle"
      title="Ошибка загрузки заданий"
      :description="tasksError.message"
    />

    <div v-if="!gradesData?.students?.length && !pending" class="py-12">
      <UEmpty
        icon="i-lucide-list-checks"
        title="Нет данных об оценках"
        description="Добавьте занятия и задания, чтобы увидеть таблицу оценок."
        variant="naked"
      />
    </div>

    <template v-else-if="gradesData?.students?.length">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <UTabs
          v-if="typeTabs.length > 1"
          v-model="activeType"
          :items="typeTabs"
          :content="false"
          size="sm"
        />
        <div v-else />

        <div class="flex items-center gap-1 rounded-lg border border-default bg-default p-0.5">
          <UButton
            v-for="item in tableModeItems"
            :key="item.value"
            :label="item.label"
            :icon="item.icon"
            :color="tableMode === item.value ? 'primary' : 'neutral'"
            :variant="tableMode === item.value ? 'soft' : 'ghost'"
            size="sm"
            @click="tableMode = item.value"
          />
        </div>
      </div>

      <GradesSummaryTable
        v-if="tableMode === 'summary'"
        :data="gradesData"
        :filtered-lessons="filteredLessons"
        :tasks-by-lesson-id="tasksByLessonId"
        :lessons-map="lessonsMap"
        :loading="pending"
      />

      <GradesTasksTable
        v-else
        :data="gradesData"
        :filtered-lessons="filteredLessons"
        :tasks-by-lesson-id="tasksByLessonId"
        :lessons-map="lessonsMap"
        :loading="pending"
      />
    </template>
  </section>
</template>
