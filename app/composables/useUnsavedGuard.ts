/**
 * Защита от потери несохранённых изменений: перехватывает переход по роуту и
 * закрытие вкладки. Состояние модалки и обработчики наружу, чтобы страница сама
 * отрисовала подтверждение с нужным текстом.
 */
export function useUnsavedGuard(
  hasUnsaved: MaybeRefOrGetter<boolean>,
  onDiscard?: () => void,
) {
  const leaveModalOpen = ref(false)
  const pendingLeavePath = ref<string | null>(null)
  let confirmed = false

  onBeforeRouteLeave((to) => {
    if (confirmed || !toValue(hasUnsaved))
      return true
    pendingLeavePath.value = to.fullPath
    leaveModalOpen.value = true
    return false
  })

  function confirmLeave() {
    confirmed = true
    leaveModalOpen.value = false
    onDiscard?.()
    const path = pendingLeavePath.value
    pendingLeavePath.value = null
    if (path)
      navigateTo(path)
  }

  function cancelLeave() {
    pendingLeavePath.value = null
    leaveModalOpen.value = false
  }

  function beforeUnloadHandler(e: BeforeUnloadEvent) {
    if (!toValue(hasUnsaved))
      return
    e.preventDefault()
    e.returnValue = ''
  }

  onMounted(() => window.addEventListener('beforeunload', beforeUnloadHandler))
  onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnloadHandler))

  return { leaveModalOpen, confirmLeave, cancelLeave }
}
