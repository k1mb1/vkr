/**
 * Единый набор UI-классов для секционных таблиц (оценки/посещаемость/итоги).
 * Раньше один и тот же объект `tableUi` дублировался в каждом компоненте —
 * теперь это одна фабрика с парой опций под различия выравнивания и чекбоксов.
 */
export interface SectionedTableUiOptions {
  /** Центрировать содержимое ячеек и заголовков. */
  center?: boolean
  /** Учитывать колонку с чекбоксом (убирает правый паддинг у такой ячейки). */
  checkbox?: boolean
}

export function sectionedTableUi(opts: SectionedTableUiOptions = {}) {
  const { center = false, checkbox = false } = opts
  const cb = checkbox ? ' [&:has([role=checkbox])]:pe-0' : ''
  return {
    thead: 'bg-elevated/60',
    tfoot: 'bg-elevated/60 border-t border-default',
    tr: 'group hover:bg-elevated/50 transition-colors',
    th: `px-3 py-3 text-sm text-highlighted ${center ? 'text-center' : 'text-left'} font-semibold border-r border-default last:border-r-0${cb}`,
    td: `p-3 text-sm text-muted whitespace-nowrap${center ? ' text-center' : ''} border-r border-default last:border-r-0${cb}`,
  } as const
}
