/**
 * Хелперы подсветки таблиц: пользовательский HEX из политики применяется как
 * мягкий полупрозрачный фон ячейки. Так текст и иконки поверх остаются читаемыми
 * и в светлой, и в тёмной теме (в отличие от заливки чистым цветом), а контент
 * не перекрывает подложку.
 */

/** Разбирает `#RRGGBB` в компоненты RGB. Возвращает null для некорректного ввода. */
function parseHex(hex: string | undefined | null): { r: number, g: number, b: number } | null {
  if (!hex)
    return null
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m)
    return null
  const int = Number.parseInt(m[1]!, 16)
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 }
}

/**
 * Стиль мягкого фона ячейки по HEX-цвету. Пустой объект, если цвета нет —
 * чтобы можно было безопасно расхлопывать в `style`.
 */
export function softHighlightBg(hex: string | undefined | null, alpha = 0.2): Record<string, string> {
  const rgb = parseHex(hex)
  if (!rgb)
    return {}
  return { backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})` }
}

/** Чуть более насыщенный фон для шапок/легенды, где подсветка должна читаться как метка. */
export function highlightChipBg(hex: string | undefined | null): Record<string, string> {
  return softHighlightBg(hex, 0.28)
}

/**
 * Стандартные цвета подсветки — единый источник для форм политик и для таблиц.
 * Применяются, когда политика выключена (или конкретный цвет не задан), поэтому
 * подсветка работает всегда: выключенная политика = стандартные цвета,
 * включённая = пользовательские. Палитра «светофора» и согласована с цветами
 * статусов (зелёный — хорошо, жёлтый — частично, красный — плохо, синий — инфо).
 */
export const GRADING_HIGHLIGHT_DEFAULTS = {
  assignmentColor: '#BFDBFE',
  fullColor: '#86EFAC',
  partialHighColor: '#FDE68A',
  partialLowColor: '#FCA5A5',
} as const

export const ATTENDANCE_HIGHLIGHT_DEFAULTS = {
  presentColor: '#86EFAC',
  lateColor: '#FDE68A',
  absentColor: '#FCA5A5',
  excusedColor: '#BFDBFE',
} as const
