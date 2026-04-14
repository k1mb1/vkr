import type { MaybeRefOrGetter } from 'vue'
import type { ZodType } from 'zod'
import { toValue } from 'vue'

type QueryPrimitive = string | number | boolean | null | undefined
type QueryValue = QueryPrimitive | QueryPrimitive[]
type BackendBody = BodyInit | object | null | undefined

type UseFetchOptionsFor<Response> = NonNullable<Parameters<typeof useFetch<Response>>[1]>
export type BackendFetchResult<Response> = ReturnType<typeof useFetch<Response>>

export type BackendQuery = Record<string, QueryValue>

type BackendFetchQueryInput<Query extends BackendQuery> = MaybeRefOrGetter<Query | undefined>
type BackendFetchBodyInput<Body extends BackendBody> = MaybeRefOrGetter<Body | undefined>
type BackendFetchBodySchemaInput<Body extends BackendBody> = MaybeRefOrGetter<ZodType<Body> | undefined>
type BackendFetchHeadersInput = MaybeRefOrGetter<HeadersInit | undefined>
type BackendFetchRequiresAuthInput = MaybeRefOrGetter<boolean | undefined>

export type BackendFetchOptions<
  Response,
  Body extends BackendBody,
  Query extends BackendQuery,
> = Omit<UseFetchOptionsFor<Response>, 'query' | 'body' | 'headers'> & {
  query?: BackendFetchQueryInput<Query>
  body?: BackendFetchBodyInput<Body>
  bodySchema?: BackendFetchBodySchemaInput<Body>
  headers?: BackendFetchHeadersInput
  requiresAuth?: BackendFetchRequiresAuthInput
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]'
}

function validateObjectBody<Body extends BackendBody>(
  body: Body | undefined,
  bodySchema: ZodType<Body> | undefined,
): Body | undefined {
  if (!bodySchema || !isPlainObject(body)) {
    return body
  }

  const parsed = bodySchema.safeParse(body)

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map(issue => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ')

    throw new TypeError(`Invalid request body: ${issues}`)
  }

  return parsed.data
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
  Query extends BackendQuery = BackendQuery,
>(
  url: string | (() => string),
  options: BackendFetchOptions<Response, Body, Query> = {},
): BackendFetchResult<Response> {
  const {
    headers,
    requiresAuth,
    query,
    body,
    bodySchema,
    ...useFetchOptions
  } = options

  const resolvedHeaders = toValue(headers)
  const resolvedRequiresAuth = toValue(requiresAuth) ?? true
  const resolvedQuery = toValue(query)
  const resolvedBody = toValue(body)
  const resolvedBodySchema = toValue(bodySchema)
  const validatedBody = validateObjectBody(resolvedBody, resolvedBodySchema)

  const requestHeaders = buildHeaders(resolvedHeaders)
  const targetPath = resolvePath(url)
  const requestQuery: { path: string } & BackendQuery = {
    path: targetPath,
    ...(resolvedQuery || {}),
  }

  if (!resolvedRequiresAuth) {
    requestHeaders.set('x-proxy-auth-optional', 'true')
  }

  const fetchOptions: UseFetchOptionsFor<Response> = {
    ...useFetchOptions,
    headers: requestHeaders,
    query: requestQuery,
    body: validatedBody,
  }

  return useFetch<Response>('/api/proxy', fetchOptions)
}
