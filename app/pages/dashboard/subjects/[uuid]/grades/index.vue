<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
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
  { label: 'Все', value: 'ALL' as const },
  { label: 'Лекции', value: 'LECTURE' as const },
  { label: 'Практики', value: 'PRACTICE' as const },
]

const sectionOptions = computed(() =>
  groupBySection(data.value?.students ?? []).map(g => ({ label: g.meta.label, value: g.meta.key })),
)

const selectedSections = ref<string[]>([])

watch(sectionOptions, (opts) => {
  const valid = new Set(opts.map(o => o.value))
  selectedSections.value = selectedSections.value.filter(v => valid.has(v))
  if (selectedSections.value.length === 0 && opts.length > 0)
    selectedSections.value = opts.map(o => o.value)
}, { immediate: true })

const allSectionsDeselected = computed(() =>
  sectionOptions.value.length > 0 && selectedSections.value.length === 0,
)

const filteredData = computed<GradingTableResponse | null>(() => {
  if (!data.value)
    return null
  const lessons = typeFilter.value === 'ALL'
    ? data.value.lessons
    : (data.value.lessons ?? []).filter(l => l.type === typeFilter.value)
  return { ...data.value, lessons }
})

// ── Export ───────────────────────────────────────────────

const exportItems = computed<DropdownMenuItem[]>(() => [
  {
    label: 'Все занятия',
    icon: 'i-lucide-layers',
    onSelect: () => downloadExcel(data.value, selectedSections.value, 'ALL'),
  },
  {
    label: 'Только лекции',
    icon: 'i-lucide-book-open',
    onSelect: () => downloadExcel(data.value, selectedSections.value, 'LECTURE'),
  },
  {
    label: 'Только практики',
    icon: 'i-lucide-pen-line',
    onSelect: () => downloadExcel(data.value, selectedSections.value, 'PRACTICE'),
  },
])
</script>

<template>
  <div class="flex h-full flex-col gap-6">
    <UPageHeader title="Оценки">
      <template #links>
        <UDropdownMenu :items="exportItems" :ui="{ content: 'w-48' }">
          <UButton
            icon="i-lucide-file-spreadsheet"
            trailing-icon="i-lucide-chevron-down"
            color="neutral"
            variant="ghost"
            :loading="exportLoading"
            :disabled="!data"
          >
            Export Excel
          </UButton>
        </UDropdownMenu>
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

      <USkeleton v-if="pending && !data" class="h-64 w-full" />

      <UEmpty
        v-else-if="allSectionsDeselected"
        icon="i-lucide-filter-x"
        title="Группы не выбраны"
        description="Выберите хотя бы одну группу в фильтре, чтобы увидеть таблицу."
        variant="naked"
        class="py-6"
      />

      <GradesSectionedTable
        v-else
        :data="filteredData"
        :all-lessons="data?.lessons"
        :pending="pending"
        :sections-filter="selectedSections"
        empty-description="Для отображения оценок нужны и студенты, и занятия."
      />
    </div>
  </div>
</template>
