/**
 * Запускает (пере)загрузку данных, как только разрешение (`permissionId`) готово.
 * Заменяет повторяющийся `watch(permissionId, pid => pid && refresh(), …)`.
 */
export function useRefreshOnPermission(
  permissionId: Ref<string>,
  refresh: () => void,
) {
  watch(permissionId, (pid) => {
    if (pid)
      refresh()
  }, { immediate: true })
}
