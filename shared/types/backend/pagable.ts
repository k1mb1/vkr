type QueryPrimitive = string | number | boolean | null | undefined
type QueryValue = QueryPrimitive | QueryPrimitive[]

type SortingState = Array<{
  id: string
  desc: boolean
}>

interface PageInfo {
  size: number
  number: number
  totalElements: number
  totalPages: number
}

interface PageResponse<T> {
  content: T[]
  page: PageInfo
}

interface PageRequest<TFilter = undefined> {
  page?: number
  size?: number
  filter?: TFilter
  sort?: SortingState
}

const PAGE_DEFAULTS = {
  page: 0,
  size: 20,
} as const

const DEFAULT_PAGE_REQUEST: Required<Omit<PageRequest<never>, 'filter' | 'sort'>> = {
  page: PAGE_DEFAULTS.page,
  size: PAGE_DEFAULTS.size,
}

type PageQuery = Record<string, QueryValue>

function isQueryPrimitive(value: unknown): value is QueryPrimitive {
  const t = typeof value
  return value === null || value === undefined || t === 'string' || t === 'number' || t === 'boolean'
}

function toSortQuery(sort: SortingState | undefined): string[] | undefined {
  if (!sort?.length) {
    return undefined
  }

  return sort.map(item => `${item.id},${item.desc ? 'desc' : 'asc'}`)
}

function addFilterToQuery(query: PageQuery, filter: unknown, prefix = '') {
  if (!filter || typeof filter !== 'object' || Array.isArray(filter)) {
    return
  }

  for (const [key, value] of Object.entries(filter as Record<string, unknown>)) {
    const queryKey = prefix ? `${prefix}.${key}` : key

    if (value === null || value === undefined) {
      continue
    }

    if (isQueryPrimitive(value)) {
      query[queryKey] = value
      continue
    }

    if (Array.isArray(value) && value.every(isQueryPrimitive)) {
      query[queryKey] = value.filter(v => v !== null && v !== undefined) as QueryPrimitive[]
      continue
    }

    if (typeof value === 'object') {
      addFilterToQuery(query, value, queryKey)
      continue
    }
  }
}

function toPageQuery<TFilter>(request: PageRequest<TFilter> = {}): PageQuery {
  const withDefaults: PageRequest<TFilter> = {
    ...DEFAULT_PAGE_REQUEST,
    ...request,
  }

  const query: PageQuery = {}
  if (withDefaults.page !== undefined && withDefaults.page !== null) {
    query.page = withDefaults.page
  }
  if (withDefaults.size !== undefined && withDefaults.size !== null) {
    query.size = withDefaults.size
  }

  const sort = toSortQuery(withDefaults.sort)
  if (sort) {
    query.sort = sort
  }

  addFilterToQuery(query, withDefaults.filter)

  return query
}

export {
  DEFAULT_PAGE_REQUEST,
  PAGE_DEFAULTS,
  toPageQuery,
}

export type {
  PageInfo,
  PageQuery,
  PageRequest,
  PageResponse,
  SortingState,
}