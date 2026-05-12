import type { components } from '#open-fetch-schemas/backend'
import { usePagable } from '~/composables/usePagable'

type GroupPageResponse = components['schemas']['GroupPageResponse']

export interface UseGroupListReturn {
  search: Ref<string>
  debouncedSearch: Ref<string>
  page: Ref<number>
  pageSize: number
  request: ComputedRef<Record<string, unknown>>

  applySearch: () => void
  clearSearch: () => void

  data: Ref<unknown>
  pending: Ref<boolean>
  error: Ref<Error | undefined | null>
  refresh: () => Promise<void>

  rows: ComputedRef<GroupPageResponse[]>
  totalElements: ComputedRef<number>
}

export function useGroupList(): UseGroupListReturn {
  const search = ref('')
  const debouncedSearch = ref('')

  const { page, pageSize, request, toPageState } = usePagable({
    filter: () => ({
      name: debouncedSearch.value || undefined,
    }),
  })

  function applySearch() {
    debouncedSearch.value = search.value
    page.value = 1
  }

  function clearSearch() {
    search.value = ''
    debouncedSearch.value = ''
    page.value = 1
  }

  const { data, pending, error, refresh } = useBackend('/api/groups', {
    method: 'GET',
    query: request,
  })

  const { rows, totalElements } = toPageState(data)

  return {
    search,
    debouncedSearch,
    page,
    pageSize,
    request,

    applySearch,
    clearSearch,

    data,
    pending,
    error,
    refresh,

    rows: rows as ComputedRef<GroupPageResponse[]>,
    totalElements,
  }
}
