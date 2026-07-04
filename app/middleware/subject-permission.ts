export default defineNuxtRouteMiddleware(async (to) => {
  const subjectId = String(to.params.uuid ?? '')

  const { hasAllPermissions, status, refresh } = usePermissions(subjectId)

  // Дождаться загрузки прав на «холодных» переходах (прямая ссылка, F5): при
  // синхронной проверке данные ещё не пришли (status !== 'success'), и без
  // ожидания страница ошибочно редиректила на обзор предмета. При переходах
  // кликами права уже в кэше (status === 'success') — лишнего запроса нет.
  if (status.value !== 'success' && status.value !== 'error')
    await refresh()

  if (!hasAllPermissions.value) {
    return navigateTo(`/dashboard/subjects/${subjectId}`)
  }
})
