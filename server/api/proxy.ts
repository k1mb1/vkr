import { getProxyRequestHeaders, proxyRequest } from 'h3'
import type { H3Event } from 'h3'
import { getAccessToken } from '#server/utils/getAccessToken'

const TRAILING_SLASH_RE = /\/+$/
const LEADING_SLASH_RE = /^\/+/
const ABSOLUTE_PROTOCOL_RE = /^[a-z][a-z\d+.-]*:\/\//i
const DEFAULT_PROXY_TIMEOUT_MS = 15000

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

function resolveTargetPath(path: unknown): string {
  if (typeof path !== 'string') {
    throw createError({ statusCode: 400, message: 'Invalid proxy path' })
  }

  const normalizedPath = path.trim() || '/'
  if (normalizedPath.startsWith('//') || ABSOLUTE_PROTOCOL_RE.test(normalizedPath)) {
    throw createError({ statusCode: 400, message: 'Invalid proxy path' })
  }

  if (!normalizedPath.startsWith('/')) {
    throw createError({ statusCode: 400, message: 'Proxy path must start with "/"' })
  }

  return normalizedPath
}

function resolveTimeoutMs(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_PROXY_TIMEOUT_MS
  }
  return Math.floor(parsed)
}

function appendQueryToUrl(targetUrl: string, query: Record<string, unknown>): string {
  const url = new URL(targetUrl)

  for (const [key, value] of Object.entries(query)) {
    if (value == null) {
      continue
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item != null) {
          url.searchParams.append(key, String(item))
        }
      }
      continue
    }
    url.searchParams.append(key, String(value))
  }

  return url.toString()
}

export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig(event)
  const backendUrl = (config.backendUrl as string) || (config.public.backendBaseUrl as string)
  const proxyTimeoutMs = resolveTimeoutMs(config.proxyTimeoutMs)
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
  const targetPath = resolveTargetPath(path)
  const baseTargetUrl = joinUrl(String(backendUrl), targetPath)
  const targetUrl = appendQueryToUrl(baseTargetUrl, query)

  const headers = new Headers(getProxyRequestHeaders(event))
  headers.delete('x-proxy-auth-optional')
  if (accessToken) {
    headers.set('authorization', `Bearer ${accessToken}`)
  }

  if (import.meta.dev) {
    console.debug('[proxy]', {
      method,
      targetPath,
      hasAuth: Boolean(accessToken),
      proxyTimeoutMs
    })
  }

  try {
    return await proxyRequest(event, targetUrl, {
      headers,
      fetchOptions: {
        signal: AbortSignal.timeout(proxyTimeoutMs),
        ignoreResponseError: true
      }
    })
  } catch (error: unknown) {
    const proxyError = error as HttpErrorShape

    if (import.meta.dev) {
      console.error('[proxy] request failed', {
        method,
        targetPath,
        statusCode: proxyError.statusCode,
        responseStatus: proxyError.response?.status,
        message: proxyError.message
      })
    }

    throw createError({
      statusCode: proxyError.response?.status ?? 502,
      message: `Proxy request failed: ${method} ${targetPath}`,
      cause: error
    })
  }
})
