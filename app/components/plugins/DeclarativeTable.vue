<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { HighlightColor, TableColumnSpec, TableViewSpec } from '#shared/plugins/manifest'
import type { StudentDatasetRow } from '~/composables/usePluginDataset'
import { UBadge, UTooltip } from '#components'
import { compileExpression, isTruthy } from '#shared/plugins/expression'
import { sectionedTableUi } from '~/utils/tableUi'
import { toolbarButton } from '~/utils/toolbarButtons'

const props = defineProps<{
  spec: TableViewSpec
  rows: StudentDatasetRow[]
  pending?: boolean
  /** Имя файла экспорта и листа. */
  title: string
}>()

type Cell = string | number | boolean | null | undefined
type ComputedRow = Record<string, Cell> & { __id: string, __group: string, __search: string }

// Статичный список классов — Tailwind видит их при сборке.
const TEXT_COLOR: Record<HighlightColor, string> = {
  success: 'text-success font-semibold',
  warning: 'text-warning font-semibold',
  error: 'text-error font-semibold',
  info: 'text-info font-semibold',
  primary: 'text-primary font-semibold',
  neutral: 'text-default font-semibold',
}
const ALIGN: Record<NonNullable<TableColumnSpec['align']>, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
}

const compiled = computed(() => {
  const filter = props.spec.filter ? compileExpression(props.spec.filter) : null
  const columns = props.spec.columns.map(col => ({
    col,
    value: compileExpression(col.value),
    highlight: (col.highlight ?? []).map(rule => ({ when: compileExpression(rule.when), color: rule.color })),
  }))
  return { filter, columns }
})

function highlightFor(columnId: string, source: StudentDatasetRow): HighlightColor | null {
  const c = compiled.value.columns.find(c => c.col.id === columnId)
  return c?.highlight.find(rule => isTruthy(rule.when(source)))?.color ?? null
}

const sourceById = computed(() => new Map(props.rows.map(r => [r.id + r.group, r])))

const computedRows = computed<ComputedRow[]>(() => {
  const { filter, columns } = compiled.value
  const out: ComputedRow[] = []
  for (const row of props.rows) {
    if (filter && !isTruthy(filter(row)))
      continue
    const r = { __id: row.id + row.group, __group: row.group, __search: row.name.toLowerCase() } as ComputedRow
    for (const { col, value } of columns)
      r[col.id] = value(row)
    out.push(r)
  }
  const sort = props.spec.sort
  if (sort) {
    const dir = sort.order === 'desc' ? -1 : 1
    out.sort((a, b) => {
      const x = a[sort.column]
      const y = b[sort.column]
      if (typeof x === 'number' && typeof y === 'number')
        return (x - y) * dir
      return String(x ?? '').localeCompare(String(y ?? ''), 'ru') * dir
    })
  }
  return out
})

// ─── фильтры ────────────────────────────────────────────────────────────────

const ALL = '__all__'
const group = ref<string>(ALL)
const search = ref('')

const groupItems = computed(() => [
  { label: 'Все группы', value: ALL },
  ...[...new Set(props.rows.map(r => r.group))].map(g => ({ label: g, value: g })),
])

const visibleRows = computed(() => {
  const q = search.value.trim().toLowerCase()
  return computedRows.value.filter(r =>
    (group.value === ALL || r.__group === group.value)
    && (!q || r.__search.includes(q)),
  )
})

// ─── колонки ────────────────────────────────────────────────────────────────

function formatValue(col: TableColumnSpec, v: Cell): string {
  if (v == null || v === '')
    return '—'
  if (typeof v === 'boolean')
    return v ? 'да' : 'нет'
  if (col.format === 'number' || col.format === 'percent') {
    const n = typeof v === 'number' ? v : Number(v)
    if (!Number.isFinite(n))
      return String(v)
    const digits = col.digits ?? 0
    const text = n.toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits })
    return col.format === 'percent' ? `${text}%` : text
  }
  return String(v)
}

const columns = computed<TableColumn<ComputedRow>[]>(() =>
  props.spec.columns.map(col => ({
    id: col.id,
    accessorKey: col.id,
    header: () => col.hint
      ? h(UTooltip, { text: col.hint }, () => h('span', { class: 'underline decoration-dotted underline-offset-4 cursor-help' }, col.label))
      : col.label,
    meta: { class: { th: ALIGN[col.align ?? 'left'], td: ALIGN[col.align ?? 'left'] } },
    cell: ({ row }) => {
      const source = sourceById.value.get(row.original.__id)
      const color = source ? highlightFor(col.id, source) : null
      const text = formatValue(col, row.original[col.id])
      if (col.format === 'badge')
        return h(UBadge, { color: color ?? 'neutral', variant: 'subtle' }, () => text)
      return h('span', { class: ['tabular-nums', color ? TEXT_COLOR[color] : 'text-default'] }, text)
    },
  })),
)

const { density } = useTableDensity()
const tableUi = computed(() => sectionedTableUi({ density: density.value }))

// ─── экспорт ────────────────────────────────────────────────────────────────

const exporting = ref(false)
async function exportExcel() {
  exporting.value = true
  try {
    const XLSX = await import('xlsx')
    const header = ['Группа', ...props.spec.columns.map(c => c.label)]
    const body = visibleRows.value.map(r => [r.__group, ...props.spec.columns.map(c => formatValue(c, r[c.id]))])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([header, ...body]), props.title.substring(0, 31))
    const blob = new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${props.title.replace(/[^\p{L}\d]+/gu, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  finally {
    exporting.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center gap-2">
      <UInput
        v-model="search"
        icon="i-lucide-search"
        placeholder="Поиск студента"
        class="w-full sm:w-64"
      />
      <USelect
        v-if="groupItems.length > 2"
        v-model="group"
        :items="groupItems"
        class="w-full sm:w-56"
      />
      <span class="text-sm text-muted">
        {{ visibleRows.length }} из {{ rows.length }}
      </span>
      <div class="flex-1" />
      <UButton
        v-bind="toolbarButton.export"
        :trailing-icon="undefined"
        :loading="exporting"
        :disabled="!visibleRows.length"
        @click="exportExcel"
      >
        Экспорт Excel
      </UButton>
      <AppDensityToggle />
    </div>

    <UTable
      :data="visibleRows"
      :columns="columns"
      :loading="pending"
      :ui="tableUi"
      sticky
      class="max-h-[calc(100vh-18rem)] rounded-lg border border-default"
    >
      <template #empty>
        <UEmpty
          icon="i-lucide-table"
          :title="spec.emptyText ?? 'Нет строк'"
          variant="naked"
          class="py-8"
        />
      </template>
    </UTable>
  </div>
</template>
