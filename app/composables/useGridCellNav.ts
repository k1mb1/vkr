/**
 * Навигация стрелками между интерактивными ячейками таблицы (grade / attendance).
 *
 * UTable (TanStack) не умеет «табличную» навигацию из коробки. Здесь —
 * спатиальный подход: по нажатию стрелки ищем ближайшую ячейку-цель в нужном
 * направлении по геометрии, с приоритетом выравнивания по строке/столбцу.
 *
 * Обработчик вешается в capture-фазе (@keydown.capture), чтобы перехватить
 * стрелки раньше, чем триггер UDropdownMenu (он открывает меню по ArrowDown).
 * Enter / Space по-прежнему открывают редактор/меню ячейки.
 */
const CELL_SELECTOR = '[data-cell-nav]'
const ARROW_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])

export function useGridCellNav() {
  function onKeydown(e: KeyboardEvent) {
    if (!ARROW_KEYS.has(e.key))
      return

    const active = document.activeElement as HTMLElement | null
    if (!active || !active.matches(CELL_SELECTOR))
      return

    // Стрелка над ячейкой — это навигация, а не скролл/открытие меню.
    e.preventDefault()
    e.stopPropagation()

    const container = e.currentTarget as HTMLElement
    const cells = Array.from(container.querySelectorAll<HTMLElement>(CELL_SELECTOR))
      .filter(el => el !== active && el.offsetParent !== null)
    if (!cells.length)
      return

    const r0 = active.getBoundingClientRect()
    const cx0 = r0.left + r0.width / 2
    const cy0 = r0.top + r0.height / 2

    let best: HTMLElement | null = null
    let bestScore = Number.POSITIVE_INFINITY

    for (const el of cells) {
      const r = el.getBoundingClientRect()
      const dx = (r.left + r.width / 2) - cx0
      const dy = (r.top + r.height / 2) - cy0

      const horizontal = e.key === 'ArrowLeft' || e.key === 'ArrowRight'
      // primary — расстояние вдоль направления (должно быть > 0),
      // cross — смещение по перпендикулярной оси.
      const primary = e.key === 'ArrowRight'
        ? dx
        : e.key === 'ArrowLeft'
          ? -dx
          : e.key === 'ArrowDown' ? dy : -dy
      const cross = horizontal ? Math.abs(dy) : Math.abs(dx)

      if (primary <= 1)
        continue

      // Сильный штраф за смещение по перпендикулярной оси — держим строку/столбец.
      const score = primary + cross * 3
      if (score < bestScore) {
        bestScore = score
        best = el
      }
    }

    best?.focus()
  }

  return { onKeydown }
}
