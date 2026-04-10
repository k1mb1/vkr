import { toValue, type MaybeRefOrGetter } from 'vue'

type QueryPrimitive = string | number | boolean | null | undefined
type QueryValue = QueryPrimitive | QueryPrimitive[]
type BackendBody = BodyInit | object | null | undefined

type UseFetchOptionsFor<Response> = NonNullable<Parameters<typeof useFetch<Response>>[1]>

export type BackendQuery = Record<string, QueryValue>

type BackendFetchQueryInput<Query extends BackendQuery> = MaybeRefOrGetter<Query | undefined>
type BackendFetchBodyInput<Body extends BackendBody> = MaybeRefOrGetter<Body | undefined>
type BackendFetchHeadersInput = MaybeRefOrGetter<HeadersInit | undefined>
type BackendFetchRequiresAuthInput = MaybeRefOrGetter<boolean | undefined>

export type BackendFetchOptions<
  Response,
  Body extends BackendBody,
  Query extends BackendQuery
> = Omit<UseFetchOptionsFor<Response>, 'query' | 'body' | 'headers'> & {
  query?: BackendFetchQueryInput<Query>
  body?: BackendFetchBodyInput<Body>
  headers?: BackendFetchHeadersInput
  requiresAuth?: BackendFetchRequiresAuthInput
}

function buildHeaders(headers?: HeadersInit): Headers {
  return new Headers(headers)
}

function resolvePath(url: string | (() => string)): string {
  const value = typeof url === 'function' ? url() : url
  return value.startsWith('/') ? value : `/${value}`
}

const useProxyFetch = createUseFetch({
  baseURL: undefined
})

export function useBackendFetch<
  Response,
  Body extends BackendBody = undefined,
  Query extends BackendQuery = BackendQuery
>(
  url: string | (() => string),
  options: BackendFetchOptions<Response, Body, Query> = {}
) {
  const {
    headers,
    requiresAuth,
    query,
    body,
    ...useFetchOptions
  } = options

  const resolvedHeaders = toValue(headers)
  const resolvedRequiresAuth = toValue(requiresAuth) ?? true
  const resolvedQuery = toValue(query)
  const resolvedBody = toValue(body)

  const requestHeaders = buildHeaders(resolvedHeaders)
  const targetPath = resolvePath(url)
  const requestQuery: { path: string } & BackendQuery = {
    path: targetPath,
    ...(resolvedQuery || {})
  }

  if (!resolvedRequiresAuth) {
    requestHeaders.set('x-proxy-auth-optional', 'true')
  }

  if (import.meta.dev) {
    console.log('[useBackendFetch]', {
      url: '/api/proxy',
      targetPath,
      method: useFetchOptions.method ?? 'GET',
      requiresAuth: resolvedRequiresAuth,
      query: requestQuery,
      body: resolvedBody
    })
  }

  const fetchOptions: Parameters<typeof useProxyFetch<Response>>[1] = {
    ...useFetchOptions,
    headers: requestHeaders,
    query: requestQuery,
    body: resolvedBody
  }

  return useProxyFetch<Response>('/api/proxy', fetchOptions)
}
