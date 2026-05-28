<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'
import { useGradesExport } from '~/composables/useGradesExport'
import { groupBySection } from '~/composables/useTableSections'

type GradingTableResponse = components['schemas']['GradingTableResponse']
type GradingTableLesson = components['schemas']['GradingTableLesson']
type LessonType = NonNullable<GradingTableLesson['type']>

const route = useRoute()
const subjectId = computed(() => String(route.params.uuid ?? ''))

const { permissionId } = usePermissions()
const { exportLoading, downloadExcel } = useGradesExport()

const { data, pending, error, refresh } = useBackend('/api/grades', {
  method: 'GET',
  query: computed(() => ({
    permissionId: permissionId.value,
    subjectId: subjectId.value,
  })),
  immediate: false,
})

watch(permissionId, (pid) => {
  if (pid)
    refresh()
}, { immediate: true })

// ── Filters ──────────────────────────────────────────────

const typeFilter = ref<'ALL' | LessonType>('ALL')

const typeTabItems = [
  { label: 'Все', value: 'ALL' },
  { label: 'Лекции', value: 'LECTURE' },
  { label: 'Практики', value: 'PRACTICE' },
]

const sectionOptions = computed(() =>
  groupBySection(data.value?.students ?? []).map(g => ({ label: g.meta.label, value: g.meta.key })),
)

const selectedSections = ref<string[]>([])

watch(sectionOptions, (opts) => {
  if (selectedSections.value.length === 0 && opts.length > 0)
    selectedSections.value = opts.map(o => o.value)
}, { immediate: true })

const filteredData = computed<GradingTableResponse | null>(() => {
  if (!data.value)
    return null
  const lessons = typeFilter.value === 'ALL'
    ? data.value.lessons
    : (data.value.lessons ?? []).filter(l => l.type === typeFilter.value)
  return { ...data.value, lessons }
})
</script>

<template>
  <div class="flex h-full flex-col gap-6">
    <UPageHeader title="Оценки">
      <template #links>
        <UButton
          icon="i-lucide-file-spreadsheet"
          color="neutral"
          variant="ghost"
          :loading="exportLoading"
          :disabled="!filteredData"
          @click="downloadExcel(filteredData, selectedSections)"
        >
          Export Excel
        </UButton>
        <UButton
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="ghost"
          :loading="pending"
          @click="refresh()"
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

    <div v-else class="flex flex-col gap-4">
      <div class="flex flex-wrap items-center gap-4">
        <UTabs v-model="typeFilter" :items="typeTabItems" :content="false" />
        <USelectMenu
          v-model="selectedSections"
          multiple
          value-key="value"
          :items="sectionOptions"
          placeholder="Группы"
          class="w-64"
        />
      </div>

      <GradesSectionedTable
        :data="filteredData"
        :pending="pending"
        :sections-filter="selectedSections"
        empty-description="Для отображения оценок нужны и студенты, и занятия."
      />
    </div>
  </div>
</template>
