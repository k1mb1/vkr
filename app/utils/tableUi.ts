/**
 * Единый набор UI-классов для секционных таблиц (оценки/посещаемость/итоги).
 * Раньше один и тот же объект `tableUi` дублировался в каждом компоненте —
 * теперь это одна фабрика с парой опций под различия выравнивания и чекбоксов.
 */
export type TableDensity = 'comfortable' | 'compact'

export interface SectionedTableUiOptions {
  /** Центрировать содержимое ячеек и заголовков. */
  center?: boolean
  /** Учитывать колонку с чекбоксом (убирает правый паддинг у такой ячейки). */
  checkbox?: boolean
  /** Плотность строк: обычная (по умолчанию) или компактная. */
  density?: TableDensity
}

export function sectionedTableUi(opts: SectionedTableUiOptions = {}) {
  const { center = false, checkbox = false, density = 'comfortable' } = opts
  const cb = checkbox ? ' [&:has([role=checkbox])]:pe-0' : ''
  const compact = density === 'compact'
  // Компактный режим — меньше вертикальных паддингов и более мелкий текст ячеек,
  // чтобы на широких матрицах помещалось больше строк без прокрутки.
  const thPad = compact ? 'px-2 py-1.5' : 'px-3 py-3'
  const tdCls = compact ? 'px-2 py-1 text-xs' : 'p-3 text-sm'
  return {
    thead: 'bg-elevated/60',
    tfoot: 'bg-elevated/60 border-t border-default',
    tr: 'group hover:bg-elevated/50 transition-colors',
    th: `${thPad} text-sm text-highlighted ${center ? 'text-center' : 'text-left'} font-semibold border-r border-default last:border-r-0${cb}`,
    td: `${tdCls} text-muted whitespace-nowrap${center ? ' text-center' : ''} border-r border-default last:border-r-0${cb}`,
  } as const
}
