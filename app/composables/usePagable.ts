import type { MaybeRefOrGetter } from 'vue'
import type { PageMetadata } from '#hey-api'
import { computed, ref, toValue } from 'vue'

interface PagedModel<T> {
  content?: T[]
  page?: PageMetadata
}

type ContentOf<T> = T extends { content?: (infer U)[] } ? U : never

const PAGE_DEFAULTS = {
  page: 0,
  size: 20,
} as const

interface UsePagableOptions<TFilter> {
  initialPage?: number
  pageSize?: number
  filter?: MaybeRefOrGetter<TFilter | undefined>
}

/**
 * Убираем потенциальные конфликты с pagination
 */
type SafeFilter<T> = Omit<T, 'page' | 'size'>

export function usePagable<TFilter extends Record<string, any> = Record<string, never>>(
  options?: UsePagableOptions<TFilter>,
) {
  const page = ref(options?.initialPage ?? PAGE_DEFAULTS.page + 1)
  const pageSize = options?.pageSize ?? PAGE_DEFAULTS.size

  /**
   * Финальный query:
   * - page, size
   * - + расплющенный filter
   */
  const request = computed(() => {
    const rawFilter = toValue(options?.filter) as SafeFilter<TFilter> | undefined

    return {
      page: page.value - 1,
      size: pageSize,
      ...rawFilter,
    } as { page: number, size: number } & SafeFilter<TFilter>
  })

  function toPageState<TSchema extends PagedModel<ContentOf<TSchema>>>(
    data: MaybeRefOrGetter<TSchema | null | undefined>,
  ) {
    const rows = computed<ContentOf<TSchema>[]>(() => (toValue(data)?.content ?? []) as ContentOf<TSchema>[])
    const totalElements = computed<number>(() => toValue(data)?.page?.totalElements ?? 0)
    const totalPages = computed<number>(() => toValue(data)?.page?.totalPages ?? 0)

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
