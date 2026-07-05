<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { LessonResponse } from '#hey-api'
import { getLessons } from '#hey-api'
import { toolbarButton } from '~/utils/toolbarButtons'

const route = useRoute()
const subjectId = computed(() => String(route.params.uuid ?? ''))

const { permissionId, pending: permissionPending } = usePermissions()

const { data, pending: lessonsPending, error, refresh } = useApi(
  {
    key: computed(() => `lessons:${subjectId.value}:${permissionId.value}`),
    immediate: false,
    watch: [permissionId],
  },
  () => getLessons({ query: { permissionId: permissionId.value } }),
)

useRefreshOnPermission(permissionId, refresh)
useRefreshOnFocus(refresh)

const pending = computed(() => permissionPending.value || lessonsPending.value)

function lessonDate(l: LessonResponse): string | undefined {
  const dates = (l.scopes ?? [])
    .map(s => s.startedAt)
    .filter((d): d is string => !!d)
  if (!dates.length)
    return undefined
  return dates.reduce((min, d) => (d < min ? d : min), dates[0]!)
}

const sortedData = computed<LessonResponse[]>(() =>
  [...(data.value ?? [])].sort((a, b) => {
    const at = lessonDate(a) ? new Date(lessonDate(a)!).getTime() : Number.POSITIVE_INFINITY
    const bt = lessonDate(b) ? new Date(lessonDate(b)!).getTime() : Number.POSITIVE_INFINITY
    return at - bt || (a.orderIndex ?? 0) - (b.orderIndex ?? 0)
  }),
)

const lectures = computed(() => sortedData.value.filter(l => l.type === 'LECTURE'))
const practices = computed(() => sortedData.value.filter(l => l.type === 'PRACTICE'))

const activeLesson = computed(() =>
  sortedData.value.find(l => l.active) ?? null,
)

const activeTab = useStoredTab<'all' | 'lectures' | 'practices'>('lessons-list-filter', 'all')

const tabs = computed(() => [
  { label: 'Все', value: 'all', badge: sortedData.value.length || undefined },
  { label: 'Лекции', value: 'lectures', badge: lectures.value.length || undefined },
  { label: 'Практики', value: 'practices', badge: practices.value.length || undefined },
])

const { exportLoading, downloadExcel } = useLessonsTopicsExport()

const exportItems = computed<DropdownMenuItem[]>(() => [
  {
    label: 'Все занятия',
    icon: 'i-lucide-layers',
    onSelect: () => downloadExcel(sortedData.value, 'ALL'),
  },
  {
    label: 'Только лекции',
    icon: 'i-lucide-book-open',
    onSelect: () => downloadExcel(sortedData.value, 'LECTURE'),
  },
  {
    label: 'Только практики',
    icon: 'i-lucide-pen-line',
    onSelect: () => downloadExcel(sortedData.value, 'PRACTICE'),
  },
])
</script>

<template>
  <div class="flex flex-col gap-6">
    <UPageHeader title="Занятия">
      <template #links>
        <UButton
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="ghost"
          :loading="pending"
          @click="refresh()"
        />
        <UDropdownMenu :items="exportItems" :ui="{ content: 'w-48' }">
          <UButton
            v-bind="toolbarButton.export"
            :loading="exportLoading"
            :disabled="!sortedData.length"
          >
            Экспорт Excel
          </UButton>
        </UDropdownMenu>
        <SubjectPermissionGate>
          <UButton
            icon="i-lucide-calendar-plus"
            label="По расписанию"
            color="neutral"
            variant="outline"
            :to="`/dashboard/subjects/${subjectId}/lessons/schedule-create`"
          />
          <UButton
            icon="i-lucide-list-plus"
            label="По количеству"
            color="neutral"
            variant="outline"
            :to="`/dashboard/subjects/${subjectId}/lessons/create`"
          />
        </SubjectPermissionGate>
      </template>
    </UPageHeader>

    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Ошибка загрузки"
      :description="error.message"
    />

    <AppHint
      id="lessons-index"
      title="Зачем это нужно"
      description="Список занятий предмета — лекции и практики, их темы, проведение (группы и даты) и задания. Чтобы выставить посещаемость или оценки по занятию, откройте его кнопкой «Открыть»."
    />

    <UAlert
      v-if="!pending && activeLesson"
      color="primary"
      variant="subtle"
      icon="i-lucide-circle-play"
      :title="`Активное занятие: ${activeLesson.topic ?? `Практика №${activeLesson.orderIndex}`}`"
      description="Это занятие — точка отсчёта для расчёта штрафа / бонуса за сроки сдачи."
    />

    <ClientOnly>
      <UTabs v-model="activeTab" :items="tabs">
        <template #content>
          <LessonsTable
            v-if="activeTab === 'all'"
            :data="sortedData"
            :loading="pending"
            :show-type="true"
            :subject-id="subjectId"
            @refresh="refresh()"
          />
          <LessonsTable
            v-else-if="activeTab === 'lectures'"
            :data="lectures"
            :loading="pending"
            :show-type="false"
            :subject-id="subjectId"
            @refresh="refresh()"
          />
          <LessonsTable
            v-else-if="activeTab === 'practices'"
            :data="practices"
            :loading="pending"
            :show-type="false"
            :subject-id="subjectId"
            @refresh="refresh()"
          />
        </template>
      </UTabs>
    </ClientOnly>
  </div>
</template>
