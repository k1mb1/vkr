type QueryPrimitive = string | number | boolean | null | undefined
type QueryValue = QueryPrimitive | QueryPrimitive[]
type BackendBody = BodyInit | object | null | undefined

type NuxtUseFetchOptions = NonNullable<Parameters<typeof useFetch>[1]>

export type BackendQuery = Record<string, QueryValue>

type SessionWithAccessToken = {
  secure?: {
    accessToken?: string
  }
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

  if (import.meta.server) {
    return authSession?.secure?.accessToken
  }

  return undefined
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
  const route = useRoute()

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
  let retriedAfter401 = false

  if (requiresAuth && token) {
    requestHeaders.set('Authorization', `Bearer ${token}`)
  }

  const authAwareFetch = (async (request: unknown, fetchRequestOptions?: unknown) => {
    const requestOptions = (fetchRequestOptions ?? {}) as {
      headers?: HeadersInit
    }

    try {
      return await $fetch<Response>(request as string, requestOptions)
    } catch (error) {
      const statusCode = (error as { response?: { status?: number }, statusCode?: number })?.response?.status
        ?? (error as { statusCode?: number })?.statusCode

      if (!requiresAuth || statusCode !== 401 || retriedAfter401) {
        throw error
      }

      retriedAfter401 = true
      const ok = await refreshSessionSingleFlight(route.fullPath)
      if (!ok) {
        throw error
      }

      const retryHeaders = buildHeaders(requestOptions.headers)
      const refreshedToken = resolveAccessToken(accessToken)
      if (refreshedToken) {
        retryHeaders.set('Authorization', `Bearer ${refreshedToken}`)
      }

      return $fetch<Response>(request as string, {
        ...requestOptions,
        headers: retryHeaders
      })
    }
  }) as typeof $fetch

  authAwareFetch.raw = $fetch.raw
  authAwareFetch.create = $fetch.create

  const fetchOptions = {
    ...useFetchOptions,
    baseURL: (config.public.backendBaseUrl as string) || undefined,
    headers: requestHeaders,
    query,
    body,
    $fetch: authAwareFetch
  }
  if (import.meta.dev) {
    const authorization = requestHeaders.get('Authorization')
    const authorizationPreview = authorization
      ? `${authorization.slice(0, 24)}...`
      : null

    console.log('[useBackendFetch]', {
      url: typeof url === 'function' ? url() : url,
      method: fetchOptions.method ?? 'GET',
      requiresAuth,
      hasToken: Boolean(token),
      hasAuthorizationHeader: Boolean(authorization),
      authorizationPreview,
      baseUrl: fetchOptions.baseURL,
      query: fetchOptions.query,
      body: fetchOptions.body
    })
  }

  return useFetch<Response>(url, fetchOptions as unknown as Parameters<typeof useFetch<Response>>[1])
}
