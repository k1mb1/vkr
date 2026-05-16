import type { MaybeRefOrGetter, Ref } from 'vue'
import { useInfiniteScroll } from '@vueuse/core'

interface SelectOption { value: string, label: string }

export function useInfiniteSelectMenu<T>(options: {
  modelValue: Ref<string | undefined>
  data: Ref<{ content?: T[] } | null | undefined>
  pending: Ref<boolean>
  totalPages: Ref<number>
  page: Ref<number>
  debouncedSearch: Ref<string>
  getId: (item: T) => string | undefined
  getLabel: (item: T) => string
  initialLabel?: MaybeRefOrGetter<string | undefined>
  exclude?: MaybeRefOrGetter<string[] | undefined>
}) {
  const { modelValue, data, pending, totalPages, page, debouncedSearch, getId, getLabel } = options

  const items = ref<T[]>([]) as Ref<T[]>
  const hasMore = computed(() => page.value < totalPages.value)

  // Cache the last resolved label so we can return a valid option even while
  // items are reloading (prevents USelectMenu from emitting undefined and
  // accidentally clearing the parent's modelValue mid-flight).
  const cachedLabel = ref<string | undefined>()

  const selectedOption = computed<SelectOption | undefined>({
    get() {
      const id = modelValue.value
      if (!id)
        return undefined
      const found = items.value.find(item => getId(item) === id)
      if (found) {
        cachedLabel.value = getLabel(found)
        return { value: id, label: cachedLabel.value }
      }
      const label = toValue(options.initialLabel) ?? cachedLabel.value
      // Always return an option when we have an id — even if items haven't
      // loaded yet — so USelectMenu never emits undefined back to the parent.
      return { value: id, label: label ?? id }
    },
    set(opt) {
      modelValue.value = opt?.value
    },
  })

  watch(
    () => data.value?.content,
    (newContent) => {
      if (!newContent)
        return
      if (page.value === 1)
        items.value = newContent
      else
        items.value.push(...newContent)
    },
    { immediate: true },
  )

  watch(debouncedSearch, () => {
    page.value = 1
    items.value = []
  })

  const selectOptions = computed(() => {
    const excluded = toValue(options.exclude)
    return items.value
      .filter(item => !excluded?.includes(getId(item)!))
      .map(item => ({ value: getId(item)!, label: getLabel(item) }))
  })

  const menuRef = ref()
  useInfiniteScroll(
    () => menuRef.value?.viewportRef,
    () => {
      if (!pending.value && hasMore.value)
        page.value++
    },
    { distance: 50 },
  )

  return { selectedOption, hasMore, selectOptions, menuRef }
}
