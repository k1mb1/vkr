import type { PageRequest, PageResponse } from '#shared/types/backend'
import type { MaybeRefOrGetter } from 'vue'
import { PAGE_DEFAULTS } from '#shared/types/backend'
import { computed, ref, toValue } from 'vue'

interface UsePagableOptions<TFilter> {
  initialPage?: number
  pageSize?: number
  filter?: MaybeRefOrGetter<TFilter | undefined>
}

type MaybePageResponse<T> = PageResponse<T> | null | undefined

export function usePagable<TFilter = Record<string, never>>(options?: UsePagableOptions<TFilter>) {
  const page = ref(options?.initialPage ?? PAGE_DEFAULTS.page + 1)
  const pageSize = options?.pageSize ?? PAGE_DEFAULTS.size

  const request = computed<PageRequest<TFilter>>(() => ({
    page: page.value - 1,
    size: pageSize,
    filter: toValue(options?.filter),
  }))

  function toPageState<T>(data: MaybeRefOrGetter<MaybePageResponse<T>>) {
    const rows = computed(() => toValue(data)?.content ?? [])
    const totalElements = computed(() => toValue(data)?.page?.totalElements ?? 0)
    const totalPages = computed(() => toValue(data)?.page?.totalPages ?? 0)

    return {
      rows,
      totalElements,
      totalPages,
    }
  }

  return {
    page,
    pageSize,
    request,
    toPageState,
  }
}
