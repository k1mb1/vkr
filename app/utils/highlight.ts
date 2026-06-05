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
