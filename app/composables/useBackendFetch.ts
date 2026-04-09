type QueryPrimitive = string | number | boolean | null | undefined
type QueryValue = QueryPrimitive | QueryPrimitive[]
type BackendBody = BodyInit | object | null | undefined

type NuxtUseFetchOptions = NonNullable<Parameters<typeof useFetch>[1]>

export type BackendQuery = Record<string, QueryValue>

export type BackendFetchOptions<
  Body extends BackendBody,
  Query extends BackendQuery
> = Omit<NuxtUseFetchOptions, 'query' | 'body' | 'headers'> & {
  query?: Query
  body?: Body
  headers?: HeadersInit
  requiresAuth?: boolean
}

function buildHeaders(headers?: HeadersInit): Headers {
  return new Headers(headers)
}

function resolvePath(url: string | (() => string)): string {
  const value = typeof url === 'function' ? url() : url
  return value.startsWith('/') ? value : `/${value}`
}

export function useBackendFetch<
  Response,
  Body extends BackendBody = undefined,
  Query extends BackendQuery = BackendQuery
>(
  url: string | (() => string),
  options: BackendFetchOptions<Body, Query> = {}
) {
  const {
    headers,
    requiresAuth = true,
    query,
    body,
    ...useFetchOptions
  } = options

  const requestHeaders = buildHeaders(headers)
  const targetPath = resolvePath(url)
  const requestQuery = {
    path: targetPath,
    ...(query || {})
  }

  if (!requiresAuth) {
    requestHeaders.set('x-proxy-auth-optional', 'true')
  }

  const fetchOptions = {
    ...useFetchOptions,
    baseURL: undefined,
    headers: requestHeaders,
    query: requestQuery,
    body,
    method: useFetchOptions.method
  }
  if (import.meta.dev) {
    console.log('[useBackendFetch]', {
      url: '/api/proxy',
      targetPath,
      method: fetchOptions.method ?? 'GET',
      requiresAuth,
      query: requestQuery,
      body: fetchOptions.body
    })
  }

  return useFetch<Response>('/api/proxy', fetchOptions as unknown as Parameters<typeof useFetch<Response>>[1])
}
