<script setup lang="ts">
import type { LessonType } from '#shared/types/backend'
import { LESSON_TYPES } from '#shared/types/backend'
import { useAttendanceApi } from '~/composables/api/useAttendanceApi'

const route = useRoute()
const subjectId = computed(() => String(route.params.subjectId ?? ''))

const { findBySubject } = useAttendanceApi()
const { data, pending, error, refresh } = findBySubject(subjectId)

const activeType = ref<string>('ALL')
const tableData = computed(() => data.value)

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
  const d = tableData.value
  if (!d)
    return []

  const allCount = d.lessons.length
  const tabs = [
    { label: 'Все', value: 'ALL', icon: 'i-lucide-layout-grid', badge: allCount || undefined },
  ]

  for (const type of LESSON_TYPES) {
    const count = d.lessons.filter(l => l.type === type).length
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

    <UTabs
      v-if="typeTabs.length > 1"
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

    <AttendanceTable
      v-else
      :data="tableData"
      :loading="pending"
      :active-type="activeType"
      @refresh="refresh"
    />
  </section>
</template>
