import type { TableColumn } from '@nuxt/ui'
import type { Cell } from '@tanstack/vue-table'

export function buildRowspanMap<T>(data: T[], key: keyof T): number[] {
  const spans: number[] = Array.from<number>({ length: data.length }).fill(1)
  let i = 0
  while (i < data.length) {
    let count = 1
    while (i + count < data.length && data[i + count]![key] === data[i]![key])
      count++
    spans[i] = count
    for (let j = 1; j < count; j++)
      spans[i + j] = 0
    i += count
  }
  return spans
}

export function withRowspan<T>(
  column: TableColumn<T>,
  spans: number[],
  visibleClass = 'align-middle',
): TableColumn<T> {
  return {
    ...column,
    meta: {
      ...(column.meta ?? {}),
      rowspan: {
        td: (cell: Cell<T, unknown>) => String(spans[cell.row.index] ?? 1),
      },
      class: {
        td: (cell: Cell<T, unknown>) =>
          spans[cell.row.index] === 0 ? 'hidden' : visibleClass,
      },
    },
  }
}
