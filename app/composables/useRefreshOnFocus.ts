import { useEventListener } from '@vueuse/core'

interface RefreshOnFocusOptions {
  /** Минимальный интервал между авто-обновлениями, мс (по умолчанию 15 c). */
  throttleMs?: number
  /** Пока возвращает false — авто-обновление пропускается (напр. есть правки). */
  enabled?: () => boolean
}

/**
 * Обновляет данные, когда пользователь возвращается на вкладку/окно — чтобы не
 * приходилось жать «Обновить» вручную. Срабатывает на `visibilitychange` и
 * `focus`, но не чаще `throttleMs` и только если `enabled()` (если задан).
 *
 * Не подключайте на экраны с инлайн-редактированием без `enabled`-гарда, иначе
 * фоновое обновление может перетереть контекст несохранённых правок.
 */
export function useRefreshOnFocus(
  refresh: () => unknown,
  options: RefreshOnFocusOptions = {},
) {
  const { throttleMs = 15_000, enabled } = options
  let last = 0

  // Только на клиенте: на сервере глобальные document/window не определены, а
  // авто-обновление по фокусу вкладки там и не нужно.
  if (!import.meta.client)
    return

  function maybeRefresh() {
    if (document.visibilityState !== 'visible')
      return
    if (enabled && !enabled())
      return
    const now = Date.now()
    if (now - last < throttleMs)
      return
    last = now
    refresh()
  }

  useEventListener(document, 'visibilitychange', maybeRefresh)
  useEventListener(window, 'focus', maybeRefresh)
}
