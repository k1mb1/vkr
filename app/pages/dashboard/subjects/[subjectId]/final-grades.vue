<script setup lang="ts">
import type { FinalGradeResponse } from '#shared/types/backend'
import type { TableColumn } from '@nuxt/ui'
import { h, resolveComponent } from 'vue'
import { useSubjectFinalGrades } from '~/composables/api/useSubjectsApi'

const route = useRoute()
const subjectId = computed(() => String(route.params.subjectId ?? ''))

const { data: gradesData, pending, error, refresh } = useSubjectFinalGrades(subjectId)

const UBadge = resolveComponent('UBadge')

const finalGrades = computed<FinalGradeResponse[]>(() => gradesData.value ?? [])

const columns: TableColumn<FinalGradeResponse>[] = [
  {
    accessorKey: 'username',
    header: 'Студент',
    meta: { class: { th: 'w-2/5', td: 'w-2/5' } },
  },
  {
    accessorKey: 'earnedPoints',
    header: 'Заработано',
    meta: { class: { th: 'w-32', td: 'w-32' } },
  },
  {
    accessorKey: 'maxPoints',
    header: 'Максимум',
    meta: { class: { th: 'w-32', td: 'w-32' } },
  },
  {
    accessorKey: 'percentage',
    header: '%',
    meta: { class: { th: 'w-24', td: 'w-24' } },
    cell: ({ row }) => {
      const pct = row.original.percentage
      if (pct === null)
        return h('span', { class: 'text-muted' }, '—')
      const color = pct >= 60 ? 'success' : pct >= 40 ? 'warning' : 'error'
      return h(UBadge, { label: `${pct.toFixed(1)}%`, color, variant: 'soft', size: 'sm' })
    },
  },
]
</script>

<template>
  <section class="flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold">
        Итоговые оценки
      </h1>
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-lucide-refresh-cw"
        :loading="pending"
        @click="() => refresh()"
      />
    </div>

    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      icon="i-lucide-circle-x"
      title="Ошибка загрузки"
      :description="error.message"
    />

    <UTable
      :data="finalGrades"
      :columns="columns"
      :loading="pending"
      sticky
    >
      <template #empty>
        <UEmpty
          icon="i-lucide-trophy"
          title="Итоговые баллы отсутствуют"
          description="Данные появятся после выставления оценок за задания."
          variant="naked"
          class="py-12"
        />
      </template>
    </UTable>
  </section>
</template>
