type QueryPrimitive = string | number | boolean | null | undefined
type QueryValue = QueryPrimitive | QueryPrimitive[]
type BackendBody = BodyInit | object | null | undefined

type NuxtUseFetchOptions = NonNullable<Parameters<typeof useFetch>[1]>

export type BackendQuery = Record<string, QueryValue>

type SessionWithAccessToken = {
  accessToken?: string
}

export type BackendFetchOptions<
  Body extends BackendBody,
  Query extends BackendQuery
> = Omit<NuxtUseFetchOptions, 'query' | 'body' | 'headers'> & {
  query?: Query
  body?: Body
  headers?: HeadersInit
  requiresAuth?: boolean
  accessToken?: string | null
}

function buildHeaders(headers?: HeadersInit): Headers {
  return new Headers(headers)
}

function resolveAccessToken(override?: string | null): string | undefined {
  if (override !== undefined && override !== null) {
    return override
  }

  const { session } = useOidcAuth()
  const authSession = session.value as SessionWithAccessToken | null | undefined

  return authSession?.accessToken
}

export function useBackendFetch<
  Response,
  Body extends BackendBody = undefined,
  Query extends BackendQuery = BackendQuery
>(
  url: string | (() => string),
  options: BackendFetchOptions<Body, Query> = {}
) {
  const config = useRuntimeConfig()

  const {
    headers,
    requiresAuth = true,
    accessToken,
    query,
    body,
    ...useFetchOptions
  } = options

  const requestHeaders = buildHeaders(headers)
  const token = resolveAccessToken(accessToken)

  if (requiresAuth && token) {
    requestHeaders.set('Authorization', `Bearer ${token}`)
  }

  const fetchOptions = {
    ...useFetchOptions,
    baseURL: (config.public.backendBaseUrl as string) || undefined,
    headers: requestHeaders,
    query,
    body
  }

  return useFetch<Response>(url, fetchOptions as unknown as Parameters<typeof useFetch<Response>>[1])
}
