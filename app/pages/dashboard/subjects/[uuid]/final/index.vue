<script setup lang="ts">
import { getResults } from '#hey-api'
import { useFinalGradesExport } from '~/composables/useFinalGradesExport'
import { useFinalTable } from '~/composables/useFinalTable'
import { sectionedTableUi } from '~/utils/tableUi'
import { toolbarButton } from '~/utils/toolbarButtons'

const { permissionId, hasAllPermissions } = usePermissions()

const route = useRoute()
const subjectId = computed(() => String(route.params.uuid ?? ''))

const { exportLoading: finalExportLoading, downloadExcel: downloadFinalExcel } = useFinalGradesExport()

const { data: results, pending, error, refresh } = useApi(
  { key: `final-results:${subjectId.value}`, immediate: false },
  () => getResults({ query: { permissionId: permissionId.value } }),
)

const data = computed(() => results.value?.grading ?? null)
const attData = computed(() => results.value?.attendance ?? null)

function refreshAll() {
  refresh()
}

useRefreshOnPermission(permissionId, refreshAll)
useRefreshOnFocus(refreshAll)

const { sortBy, sortItems } = useStudentSort()

const {
  finalEnabled,
  finalPolicy,
  sectionOptions,
  selectedSections,
  sections,
  allSectionsDeselected,
  buildColumns,
  fullscreenSectionKey,
  fullscreenSection,
} = useFinalTable(data, attData, sortBy)

const { density } = useTableDensity()
// center: true — все числовые колонки итогов центрированы через meta; без общего
// центрирования базовый text-left конфликтовал с ним и ячейки «плыли».
const tableUi = computed(() => sectionedTableUi({ density: density.value, center: true }))
</script>

<template>
  <div class="flex flex-col gap-6">
    <UPageHeader title="Итоговые оценки">
      <template #links>
        <UButton
          v-bind="toolbarButton.export"
          :trailing-icon="undefined"
          :loading="finalExportLoading"
          :disabled="!sections.length"
          @click="downloadFinalExcel(sections)"
        >
          Экспорт Excel
        </UButton>
        <AppDensityToggle />
        <UButton
          v-bind="toolbarButton.refresh"
          :loading="pending"
          @click="refreshAll()"
        />
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

    <template v-else>
      <AppHint
        id="final-index"
        title="Сводные итоги по студентам"
        description="Суммы баллов по лекциям и практикам с учётом штрафов, бонусов и посещаемости. Если включена промежуточная аттестация, в колонке «Вердикт» студенту присваивается самый высокий уровень, условия которого он выполнил; при невыполнении порога посещаемости — «Не аттестован»."
      />

      <!-- Filters -->
      <div class="flex flex-wrap items-center gap-4">
        <USelectMenu
          v-model="selectedSections"
          multiple
          value-key="value"
          :items="sectionOptions"
          placeholder="Группы"
          class="w-64"
        />
        <USelect
          v-model="sortBy"
          :items="sortItems"
          value-key="value"
          icon="i-lucide-arrow-down-up"
          class="w-44"
        />
      </div>

      <!-- Verdict legend -->
      <div v-if="finalEnabled && finalPolicy?.bands?.length" class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span class="font-medium text-default">Вердикт:</span>
        <span v-for="(band, i) in finalPolicy.bands" :key="i" class="flex items-center gap-1">
          <UIcon
            :name="finalPolicy.bands.length <= 1 || i / (finalPolicy.bands.length - 1) <= 0.5 ? 'i-lucide-circle-check' : 'i-lucide-circle-alert'"
            :class="finalPolicy.bands.length <= 1 || i / (finalPolicy.bands.length - 1) <= 0.5 ? 'size-3.5 text-success' : 'size-3.5 text-warning'"
          />
          {{ band.label }}
        </span>
        <span class="flex items-center gap-1">
          <UIcon name="i-lucide-circle-x" class="size-3.5 text-error" /> не аттестован
        </span>
        <span class="flex items-center gap-1">
          <span class="text-default">ещё:</span>
          <UIcon name="i-lucide-arrow-up" class="size-3.5" />
          — сколько баллов / обязательных задач не хватает до следующего уровня
        </span>
      </div>

      <!-- Bands legend -->
      <div v-if="finalEnabled && finalPolicy?.bands?.length" class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span class="font-medium text-default">Уровни:</span>
        <span v-for="(band, i) in finalPolicy.bands" :key="i" class="flex items-center gap-1">
          <UBadge
            :label="band.label"
            variant="subtle"
            color="neutral"
            class="font-semibold"
          />
          <span v-if="band.minPoints != null">Мин. баллов: {{ band.minPoints }}</span>
          <span v-if="band.minPercent != null">Мин. %: {{ band.minPercent }}</span>
          <span>{{ band.requiredTasks != null ? `Мин. задач: ${band.requiredTasks}` : 'Все обязательные задачи' }}</span>
        </span>
      </div>

      <USkeleton v-if="pending && !data" class="h-64 w-full" />

      <UEmpty
        v-else-if="allSectionsDeselected"
        icon="i-lucide-filter-x"
        title="Группы не выбраны"
        description="Выберите хотя бы одну группу, чтобы увидеть итоговую таблицу."
        variant="naked"
        class="py-6"
      />

      <UEmpty
        v-else-if="!pending && sections.length === 0"
        icon="i-lucide-clipboard-x"
        title="Нет данных"
        description="Нет студентов или занятий для отображения итогов."
        variant="naked"
        class="py-6"
      >
        <template v-if="hasAllPermissions" #actions>
          <UButton
            icon="i-lucide-plus"
            label="Создать занятия"
            color="primary"
            :to="`/dashboard/subjects/${subjectId}/lessons/create`"
          />
        </template>
      </UEmpty>

      <template v-else>
        <section
          v-for="section in sections"
          :key="section.key"
          class="flex flex-col gap-3"
        >
          <!-- Section header -->
          <div class="flex flex-wrap items-center gap-3">
            <h3 class="text-sm font-semibold text-default">
              {{ section.label }}
            </h3>
            <span class="text-xs text-muted">{{ section.rows.length }} студ.</span>

            <div class="flex items-center gap-3 ml-auto">
              <span class="text-xs text-muted tabular-nums">
                средний {{ section.avgTotal }} · макс {{ section.maxTotal }} · мин {{ section.minTotal }}
              </span>
              <UButton
                icon="i-lucide-maximize-2"
                color="neutral"
                variant="ghost"
                title="На весь экран"
                @click="fullscreenSectionKey = section.key"
              />
            </div>
          </div>

          <!-- Table -->
          <AppScrollHint>
            <UTable
              :data="section.rows"
              :columns="buildColumns(section)"
              :loading="pending && section.rows.length === 0"
              loading-color="primary"
              loading-animation="carousel"
              sticky
              class="rounded-lg border border-default"
              :ui="tableUi"
            >
              <template #username-cell="{ row }">
                <span
                  :title="row.original.username"
                  class="line-clamp-1 font-medium text-highlighted"
                >{{ row.original.username }}</span>
              </template>
            </UTable>
          </AppScrollHint>
        </section>
      </template>
    </template>

    <UModal
      :open="fullscreenSection !== null"
      fullscreen
      :title="fullscreenSection?.label ?? ''"
      @update:open="(v) => { if (!v) fullscreenSectionKey = null }"
    >
      <template #body>
        <AppScrollHint v-if="fullscreenSection">
          <UTable
            :data="fullscreenSection.rows"
            :columns="buildColumns(fullscreenSection)"
            sticky
            style="max-height: calc(100vh - 8rem)"
            class="rounded-lg border border-default"
            :ui="tableUi"
          >
            <template #username-cell="{ row }">
              <span
                :title="row.original.username"
                class="line-clamp-1 font-medium text-highlighted"
              >{{ row.original.username }}</span>
            </template>
          </UTable>
        </AppScrollHint>
      </template>
    </UModal>
  </div>
</template>
