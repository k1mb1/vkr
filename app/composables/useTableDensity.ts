import type { TableDensity } from '~/utils/tableUi'

/**
 * Плотность секционных таблиц (посещаемость/оценки/итоги), общая на все экраны
 * и запоминаемая между сессиями. Cookie, а не localStorage — значение доступно
 * уже на SSR, поэтому таблица рендерится сразу в нужной плотности без «прыжка»
 * после гидрации.
 */
export function useTableDensity() {
  const density = useCookie<TableDensity>('table-density', {
    default: () => 'comfortable',
    sameSite: 'lax',
  })

  const compact = computed(() => density.value === 'compact')

  function toggle() {
    density.value = density.value === 'compact' ? 'comfortable' : 'compact'
  }

  return { density, compact, toggle }
}
