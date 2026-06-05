<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'
import type { AttendanceTableProps } from '~/composables/useAttendanceTable'
import { useAttendanceTable } from '~/composables/useAttendanceTable'
import { sectionedTableUi } from '~/utils/tableUi'

type UpsertAttendanceRequest = components['schemas']['UpsertAttendanceRequest']

const props = withDefaults(defineProps<AttendanceTableProps>(), {
  pending: false,
  showLegend: true,
  emptyDescription: 'Нет проведений или назначенных студентов.',
  editable: false,
  pendingChanges: () => ({}),
  tableMaxHeight: 'calc(100vh - 18rem)',
  attendancePolicy: null,
})

const emit = defineEmits<{
  change: [payload: UpsertAttendanceRequest]
}>()

const {
  legendItems,
  sections,
  isEmpty,
  hasAnyLessons,
  onKeydown,
} = useAttendanceTable(props, emit)

const tableUi = sectionedTableUi({ checkbox: true })
</script>

<template>
  <SectionedTableShell
    :sections="sections"
    :pending="pending"
    :is-empty="isEmpty"
    :has-any-lessons="hasAnyLessons"
    :empty-description="emptyDescription"
    :table-max-height="tableMaxHeight"
    :ui="tableUi"
    :cell-keydown="onKeydown"
  >
    <template v-if="showLegend" #legend>
      <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span v-for="item in legendItems" :key="item.status" class="flex items-center gap-1">
          <span
            class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold"
            :class="item.textClass"
            :style="item.chipStyle"
          >
            <UIcon :name="item.icon" class="size-3.5 shrink-0" />
            {{ item.short }}
          </span>
          <span>— {{ item.label }}</span>
        </span>
        <span v-if="editable" class="flex items-center gap-1 ml-auto">
          <UKbd value="←" />
          <UKbd value="↑" />
          <UKbd value="↓" />
          <UKbd value="→" />
          — навигация по ячейкам
        </span>
      </div>
    </template>

    <template #section-extra="{ section }">
      <span class="text-xs text-muted">{{ section.students.length }}</span>
      <span
        v-if="section.totalCells"
        class="text-xs text-muted tabular-nums"
        :title="`Отмечено ${section.filledCells} из ${section.totalCells}`"
      >
        отмечено {{ section.filledCells }}/{{ section.totalCells }}
      </span>
    </template>
  </SectionedTableShell>
</template>
