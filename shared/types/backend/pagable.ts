type QueryPrimitive = string | number | boolean | null | undefined
type QueryValue = QueryPrimitive | QueryPrimitive[]

export type SortingState = Array<{
  id: string
  desc: boolean
}>

export interface PageInfo {
  size: number
  number: number
  totalElements: number
  totalPages: number
}

export interface PageResponse<T> {
  content: T[]
  page: PageInfo
}

export interface PageRequest<TFilter = undefined> {
  page?: number
  size?: number
  filter?: TFilter
  sort?: SortingState
}

export const DEFAULT_PAGE_REQUEST: Required<Omit<PageRequest<never>, 'filter' | 'sort'>> = {
  page: 0,
  size: 20
}

export type PageQuery = Record<string, QueryValue>

function isQueryPrimitive(value: unknown): value is QueryPrimitive {
  return value === null || value === undefined || ['string', 'number', 'boolean'].includes(typeof value)
}

function toSortQuery(sort: SortingState | undefined): string[] | undefined {
  if (!sort?.length) {
    return undefined
  }

  return sort.map(item => `${item.id},${item.desc ? 'desc' : 'asc'}`)
}

function addFilterToQuery(query: PageQuery, filter: unknown, prefix = 'filter') {
  if (!filter || typeof filter !== 'object' || Array.isArray(filter)) {
    return
  }

  for (const [key, value] of Object.entries(filter as Record<string, unknown>)) {
    const queryKey = `${prefix}.${key}`

    if (isQueryPrimitive(value)) {
      query[queryKey] = value
      continue
    }

    if (Array.isArray(value) && value.every(isQueryPrimitive)) {
      query[queryKey] = value
      continue
    }

    query[queryKey] = JSON.stringify(value)
  }
}

export function toPageQuery<TFilter>(request: PageRequest<TFilter> = {}): PageQuery {
  const withDefaults: PageRequest<TFilter> = {
    ...DEFAULT_PAGE_REQUEST,
    ...request
  }

  const query: PageQuery = {
    page: withDefaults.page,
    size: withDefaults.size
  }

  const sort = toSortQuery(withDefaults.sort)
  if (sort) {
    query.sort = sort
  }

  addFilterToQuery(query, withDefaults.filter)

  return query
}
