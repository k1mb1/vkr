import type { H3Event } from 'h3'
import { getAccessToken } from '#server/utils/getAccessToken'

const BODY_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'] as const)
const TRAILING_SLASH_RE = /\/+$/
const LEADING_SLASH_RE = /^\/+/

type HttpMethod
  = | 'GET'
    | 'HEAD'
    | 'POST'
    | 'PUT'
    | 'PATCH'
    | 'DELETE'
    | 'CONNECT'
    | 'OPTIONS'
    | 'TRACE'

type HttpErrorShape = {
  statusCode?: number
  message?: string
  data?: {
    message?: string
  }
  response?: {
    status?: number
  }
}

function normalizeMethod(method?: string): HttpMethod {
  const m = (method ?? 'GET').toUpperCase()
  if (
    m === 'GET'
    || m === 'HEAD'
    || m === 'POST'
    || m === 'PUT'
    || m === 'PATCH'
    || m === 'DELETE'
    || m === 'CONNECT'
    || m === 'OPTIONS'
    || m === 'TRACE'
  ) {
    return m
  }
  return 'GET'
}

function joinUrl(base: string, path: string): string {
  return `${base.replace(TRAILING_SLASH_RE, '')}/${path.replace(LEADING_SLASH_RE, '')}`
}

export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig(event)
  const backendUrl = (config.backendUrl as string) || (config.public.backendBaseUrl as string)
  const authOptional = getHeader(event, 'x-proxy-auth-optional') === 'true'

  if (!backendUrl) {
    throw createError({ statusCode: 500, message: 'Backend URL is not configured' })
  }

  let accessToken: string | null = null
  try {
    accessToken = await getAccessToken(event)
  } catch (error: unknown) {
    const authError = error as HttpErrorShape
    if (!authOptional || (authError.statusCode && authError.statusCode !== 401)) {
      throw error
    }
  }
  const method = normalizeMethod(event.method)

  const { path = '/', ...query } = getQuery(event) as Record<string, unknown>
  const targetUrl = joinUrl(String(backendUrl), String(path))

  const body = BODY_METHODS.has(method as 'POST' | 'PUT' | 'PATCH' | 'DELETE')
    ? await readRawBody(event)
    : undefined

  try {
    const response = await $fetch.raw(targetUrl, {
      method,
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
      },
      query: Object.keys(query).length > 0 ? query : undefined,
      body
    })

    return response._data
  } catch (error: unknown) {
    const proxyError = error as HttpErrorShape
    throw createError({
      statusCode: proxyError.response?.status ?? 502,
      message: proxyError.data?.message ?? proxyError.message ?? `Proxy request failed: ${method} ${targetUrl}`
    })
  }
})
