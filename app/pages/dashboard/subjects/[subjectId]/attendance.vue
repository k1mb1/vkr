<script setup lang="ts">
import type { LessonResponse, LessonType, SubjectAttendanceResponse } from '#shared/types/backend'
import { LESSON_TYPES } from '#shared/types/backend'
import { useLessons } from '~/composables/api/useLessonsApi'
import { useBackendFetch } from '~/composables/useBackendFetch'

const route = useRoute()
const subjectId = computed(() => String(route.params.subjectId ?? ''))

const { data: lessonsData, pending: lessonsPending } = useLessons({ filter: { subjectId: subjectId.value } })

const allLessons = computed<LessonResponse[]>(() => {
  const val = lessonsData.value as any
  if (Array.isArray(val))
    return val
  if (val && Array.isArray(val.content))
    return val.content as LessonResponse[]
  return []
})

const activeType = ref<string>('ALL')

const { data, pending, error, refresh } = useBackendFetch<SubjectAttendanceResponse>(
  () => `/subjects/${subjectId.value}/attendance`,
  { method: 'GET' },
)

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
  const lessons = allLessons.value
  if (lessons.length === 0)
    return []

  const tabs = [
    { label: 'Все', value: 'ALL', icon: 'i-lucide-layout-grid', badge: lessons.length || undefined },
  ]

  for (const type of LESSON_TYPES) {
    const count = lessons.filter(l => l.type === type).length
    if (count > 0) {
      tabs.push({
        label: LESSON_TYPE_LABELS[type],
        value: type,
        icon: LESSON_TYPE_ICONS[type],
        badge: count,
      })
    }
  }

  return tabs
})
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

    <USkeleton v-if="lessonsPending && allLessons.length === 0" class="h-10 w-full" />

    <UTabs
      v-else-if="typeTabs.length > 1"
      v-model="activeType"
      :items="typeTabs"
      :content="false"
    />

    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      icon="i-lucide-circle-x"
      title="Ошибка загрузки"
      :description="error.message"
    />

    <div v-if="!lessonsPending && !pending && allLessons.length === 0" class="py-12">
      <UEmpty
        icon="i-lucide-book-open"
        title="Нет занятий"
        description="Создайте занятия, чтобы увидеть посещаемость."
        variant="naked"
      />
    </div>

    <AttendanceTable
      v-if="!error && allLessons.length > 0"
      :data="data"
      :loading="pending"
      :active-type="activeType"
      @refresh="refresh"
    />
  </section>
</template>
