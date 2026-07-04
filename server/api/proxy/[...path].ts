import { proxyRequest } from 'h3'
import { getDemoResponse } from '#server/utils/demoData'
import { isDemoSession } from '#server/utils/demoMode'
import { getAccessToken } from '#server/utils/getAccessToken'

const DEFAULT_TIMEOUT_MS = 15_000

const ALLOWED_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'])

const FORWARDED_REQUEST_HEADERS = new Set([
  'accept',
  'accept-language',
  'accept-encoding',
  'content-type',
  'content-length',
  'user-agent',
  'x-request-id',
  'x-proxy-auth-optional',
])

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const backendUrl = config.public.backendBaseUrl

  if (!ALLOWED_METHODS.has(event.method)) {
    throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
  }

  // Path traversal guard
  const path = getRouterParam(event, 'path') ?? ''
  const decodedPath = (() => {
    try {
      return decodeURIComponent(path)
    }
    catch {
      throw createError({ statusCode: 400, statusMessage: 'Invalid path' })
    }
  })()
  if (decodedPath.includes('..') || decodedPath.includes('\\') || /%2e%2e/i.test(path)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid path' })
  }

  const query = getQuery(event)

  // Demo mode: serve seeded fixtures instead of hitting the backend. Only for
  // demo sessions (guest login via /demo) when the demo flag is on. Works even
  // without a configured backend, so the demo can be deployed standalone.
  if (await isDemoSession(event)) {
    const demo = getDemoResponse(event.method, decodedPath, query as Record<string, unknown>)
    if (demo) {
      setResponseStatus(event, demo.status ?? 200)
      setResponseHeader(event, 'cache-control', 'no-store')
      return demo.body
    }
  }

  if (!backendUrl) {
    throw createError({
      statusCode: 500,
      message: 'Backend URL is not configured',
    })
  }

  // Auth
  const authOptional = getHeader(event, 'x-proxy-auth-optional') === 'true'
  let accessToken: string | null = null
  try {
    accessToken = await getAccessToken(event)
  }
  catch (err: any) {
    if (!authOptional || err?.statusCode !== 401)
      throw err
  }

  // Build target URL
  const url = new URL(`${backendUrl}/${path}`.replace(/([^:])\/+/g, '$1/'))
  for (const [k, v] of Object.entries(query)) {
    for (const item of ([] as string[]).concat(v as string)) {
      if (item != null)
        url.searchParams.append(k, item)
    }
  }

  // Headers — whitelist only, then re-add Authorization. Strips cookies, host,
  // x-forwarded-* and any other client-controlled hop-by-hop headers.
  const headers = new Headers()
  for (const [name, value] of Object.entries(getRequestHeaders(event))) {
    if (!value)
      continue
    if (FORWARDED_REQUEST_HEADERS.has(name.toLowerCase()))
      headers.set(name, Array.isArray(value) ? value.join(', ') : value)
  }
  if (accessToken)
    headers.set('authorization', `Bearer ${accessToken}`)

  const timeoutMs = Number(config.proxyTimeoutMs) || DEFAULT_TIMEOUT_MS

  if (import.meta.dev) {
    console.warn('[proxy]', event.method, url.pathname, { auth: !!accessToken })
  }

  // The public check-in session endpoint exposes session details (lesson topic,
  // audience) by link, without auth. Once the survey is over (confirmed or
  // cancelled) we must not reveal any of it: strip the details server-side so
  // the browser never receives them, and forbid caching of the public response.
  const isPublicSessionGet = event.method === 'GET'
    && /^api\/check-in-sessions\/public\/[^/]+$/.test(decodedPath)

  if (isPublicSessionGet) {
    const res = await $fetch.raw(url.toString(), {
      method: 'GET',
      headers,
      ignoreResponseError: true,
      signal: AbortSignal.timeout(timeoutMs),
    })

    setResponseStatus(event, res.status)
    setResponseHeader(event, 'cache-control', 'no-store')

    const body = res._data
    if (body && typeof body === 'object' && 'state' in body) {
      const state = (body as { state?: string }).state
      const sessionOver = state === 'CONFIRMED' || state === 'CANCELLED'
      if (sessionOver) {
        const b = body as Record<string, unknown>
        delete b.lessonTopic
        b.audience = []
      }
    }

    return body
  }

  return proxyRequest(event, url.toString(), {
    headers,
    fetchOptions: {
      signal: AbortSignal.timeout(timeoutMs),
      ignoreResponseError: true,
    },
  })
})
