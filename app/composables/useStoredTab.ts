/**
 * Реактивная вкладка с запоминанием последнего выбора в localStorage.
 *
 * SSR-безопасно: на сервере и при первом клиентском рендере берётся значение по
 * умолчанию, сохранённое подхватывается уже после монтирования — поэтому гидрация
 * не рассинхронизируется. Ключ может быть геттером (например, завязанным на id
 * сущности): при его смене подгружается значение, сохранённое для нового ключа.
 */
export function useStoredTab<T extends string>(
  key: MaybeRefOrGetter<string>,
  defaultValue: T,
): Ref<T> {
  const tab = ref(defaultValue) as Ref<T>
  const storageKey = () => `tab:${toValue(key)}`

  function load() {
    if (!import.meta.client)
      return
    const saved = localStorage.getItem(storageKey())
    tab.value = (saved as T | null) ?? defaultValue
  }

  onMounted(load)
  watch(() => toValue(key), load)
  watch(tab, (value) => {
    if (import.meta.client)
      localStorage.setItem(storageKey(), value)
  })

  return tab
}
