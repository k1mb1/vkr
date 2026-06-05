<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'
import type { GradesTableProps } from '~/composables/useGradesTable'
import { computed } from 'vue'
import { useGradesTable } from '~/composables/useGradesTable'
import { highlightChipBg } from '~/utils/highlight'
import { sectionedTableUi } from '~/utils/tableUi'

type UpsertGradeRequest = components['schemas']['UpsertGradeRequest']

const props = withDefaults(defineProps<GradesTableProps>(), {
  pending: false,
  showLegend: true,
  emptyDescription: 'Для отображения оценок нужны и студенты, и занятия.',
  editable: false,
  pendingChanges: () => ({}),
  tableMaxHeight: 'calc(100vh - 18rem)',
})

const emit = defineEmits<{
  change: [payload: UpsertGradeRequest]
}>()

const {
  sections,
  isEmpty,
  hasAnyLessons,
  onKeydown,
  highlightEnabled,
  highlightColors,
  editTarget,
  closeEdit,
  saveEdit,
  editInvalid,
  editTargetPenaltyCount,
  editTargetBonusCount,
  editTargetFinalScore,
} = useGradesTable(props, emit)

const legendColors = computed(() => {
  if (!highlightEnabled.value)
    return []
  return [
    { label: 'Колонка задания', color: highlightColors.value.assignment },
    { label: 'Решено полностью', color: highlightColors.value.full },
    { label: 'Меньше половины', color: highlightColors.value.partialLow },
    { label: 'Больше половины', color: highlightColors.value.partialHigh },
  ].filter(item => item.color)
})

const tableUi = sectionedTableUi({ center: true, checkbox: true })
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
        <span><span class="text-error font-semibold">*</span> — обязательное задание</span>
        <span><span class="text-warning font-semibold">8</span> <span class="line-through">10</span> — с понижением</span>
        <span><span class="text-success font-semibold">12</span> <span class="line-through">10</span> — с бонусом</span>
        <span class="flex items-center gap-1"><UIcon name="i-lucide-triangle-alert" class="size-3.5 text-warning" /> — выполнено не полностью</span>
        <span v-for="item in legendColors" :key="item.label" class="flex items-center gap-1">
          <span
            class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold"
            :style="highlightChipBg(item.color)"
          >
            <span class="size-2.5 rounded-full" :style="{ backgroundColor: item.color }" />
            {{ item.label }}
          </span>
        </span>
        <span class="flex items-center gap-1">
          <span
            class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold text-error"
            :style="highlightChipBg('#fee2e2')"
          >
            <span class="size-2.5 rounded-full" :style="{ backgroundColor: '#fee2e2' }" />
            обязательное не выполнено
          </span>
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
      <UBadge variant="subtle" color="neutral" :label="`${section.students.length}`" />
    </template>

    <template #after>
      <UModal
        :open="editTarget !== null"
        :title="editTarget?.assignment
          ? `Оценка · задание №${editTarget.assignment.order}`
          : 'Дополнительная оценка'"
        @update:open="(v: boolean) => { if (!v) closeEdit() }"
      >
        <template #body>
          <div v-if="editTarget" class="flex flex-col gap-4">
            <div class="flex flex-col gap-1 text-sm">
              <div class="flex justify-between gap-2">
                <span class="text-muted">Студент</span>
                <span class="font-medium text-highlighted">{{ editTarget.studentName }}</span>
              </div>
              <div v-if="editTarget.lessonTopic" class="flex justify-between gap-2">
                <span class="text-muted">Занятие</span>
                <span class="text-default text-right">{{ editTarget.lessonTopic }}</span>
              </div>
              <div v-if="editTarget.assignment" class="flex justify-between gap-2">
                <span class="text-muted">Макс. балл</span>
                <span class="tabular-nums text-default">
                  {{ editTarget.maxPoints }}
                  <UBadge
                    v-if="editTarget.required"
                    size="xs"
                    variant="solid"
                    color="error"
                    label="req"
                    class="ml-1"
                  />
                </span>
              </div>
              <div v-if="editTarget.serverScore != null" class="flex justify-between gap-2">
                <span class="text-muted">Сохранённый балл</span>
                <span class="tabular-nums text-default">{{ editTarget.serverScore }}</span>
              </div>
              <div v-if="editTargetPenaltyCount > 0" class="flex justify-between gap-2">
                <span class="text-muted">Понижений</span>
                <span class="tabular-nums text-default">{{ editTargetPenaltyCount }}</span>
              </div>
              <div v-if="editTargetBonusCount > 0" class="flex justify-between gap-2">
                <span class="text-muted">Бонусов</span>
                <span class="tabular-nums text-default">{{ editTargetBonusCount }}</span>
              </div>
              <div v-if="editTargetFinalScore != null && (editTargetPenaltyCount > 0 || editTargetBonusCount > 0)" class="flex justify-between gap-2">
                <span class="text-muted">Итоговый балл</span>
                <span
                  class="tabular-nums font-semibold"
                  :class="editTargetBonusCount > 0 && editTargetPenaltyCount === 0 ? 'text-success' : 'text-warning'"
                >{{ Math.round(editTargetFinalScore * 100) / 100 }}</span>
              </div>
            </div>

            <UFormField
              label="Балл"
              :error="editInvalid
                ? editTarget.maxPoints != null && editTarget.score != null && editTarget.score > editTarget.maxPoints
                  ? `Не больше ${editTarget.maxPoints}`
                  : 'Целое число больше нуля'
                : undefined"
              required
            >
              <div class="flex items-center gap-2">
                <UInput
                  v-model.number="editTarget.score"
                  type="number"
                  :min="1"
                  :max="editTarget.maxPoints"
                  step="1"
                  placeholder="Балл"
                  autofocus
                  class="flex-1"
                  @keydown.enter="saveEdit"
                />
                <UButton
                  v-if="editTarget.maxPoints != null"
                  color="neutral"
                  variant="soft"
                  size="sm"
                  :label="`Макс. ${editTarget.maxPoints}`"
                  :disabled="editTarget.score === editTarget.maxPoints"
                  @click="editTarget.score = editTarget.maxPoints ?? null"
                />
              </div>
            </UFormField>

            <UFormField label="Комментарий">
              <UTextarea
                v-model="editTarget.comment"
                :rows="2"
                placeholder="—"
                class="w-full"
              />
            </UFormField>

            <div class="flex justify-end gap-2">
              <UButton color="neutral" variant="soft" @click="closeEdit">
                Отмена
              </UButton>
              <UButton
                color="primary"
                icon="i-lucide-check"
                :disabled="editInvalid"
                @click="saveEdit"
              >
                Применить
              </UButton>
            </div>
          </div>
        </template>
      </UModal>
    </template>
  </SectionedTableShell>
</template>
