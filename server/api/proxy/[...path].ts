import { getAccessToken } from '#server/utils/getAccessToken'
import { getProxyRequestHeaders, proxyRequest } from 'h3'

const DEFAULT_TIMEOUT_MS = 15_000

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const backendUrl = config.public.backendBaseUrl

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
  const path = getRouterParam(event, 'path') ?? ''
  const query = getQuery(event)
  const url = new URL(`${backendUrl}/${path}`.replace(/([^:])\/+/g, '$1/'))
  for (const [k, v] of Object.entries(query)) {
    for (const item of ([] as string[]).concat(v as string)) {
      if (item != null)
        url.searchParams.append(k, item)
    }
  }

  // Headers
  const headers = new Headers(getProxyRequestHeaders(event))
  if (accessToken)
    headers.set('authorization', `Bearer ${accessToken}`)

  // Proxy
  const timeoutMs = Number(config.proxyTimeoutMs) || DEFAULT_TIMEOUT_MS

  if (import.meta.dev) {
    console.warn('[proxy]', event.method, url.pathname, {
      auth: !!accessToken,
    })
  }

  return proxyRequest(event, url.toString(), {
    headers,
    fetchOptions: {
      signal: AbortSignal.timeout(timeoutMs),
      ignoreResponseError: true,
    },
  })
})
