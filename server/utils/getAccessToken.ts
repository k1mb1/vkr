import type { H3Event } from 'h3'

interface OidcTokenResponse {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  error?: string
  error_description?: string
}

interface RefreshedTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

// Кешируем endpoint в памяти — нет смысла ходить на discovery при каждом запросе
let cachedTokenEndpoint: string | null = null

// Дедупликация параллельных refresh-запросов с одним refresh_token.
// Критично для SSR: при рендере страницы несколько useFetch стартуют параллельно,
// каждый видит просроченный access_token и пытается обновить его. Без дедупликации
// при включённой ротации refresh-токенов первый запрос успевает, остальные летят
// со «старым» (уже инвалидированным) refresh_token и получают 401.
const refreshInFlight = new Map<string, Promise<RefreshedTokens>>()
const INFLIGHT_TTL_MS = 5_000

async function resolveTokenEndpoint(event: H3Event): Promise<string> {
  if (cachedTokenEndpoint)
    return cachedTokenEndpoint

  const discoveryUrl = useRuntimeConfig(event).oauth?.oidc?.openidConfig
  if (!discoveryUrl || typeof discoveryUrl !== 'string') {
    throw createError({
      statusCode: 500,
      message: 'OIDC discovery URL is not configured',
    })
  }

  const { token_endpoint } = await $fetch<{ token_endpoint?: string }>(
    discoveryUrl,
  )
  if (!token_endpoint) {
    throw createError({
      statusCode: 500,
      message: 'OIDC token endpoint was not discovered',
    })
  }

  return (cachedTokenEndpoint = token_endpoint)
}

function performRefresh(event: H3Event, refreshToken: string): Promise<RefreshedTokens> {
  const existing = refreshInFlight.get(refreshToken)
  if (existing)
    return existing

  const promise = (async (): Promise<RefreshedTokens> => {
    const { oauth } = useRuntimeConfig(event)
    const tokenEndpoint = await resolveTokenEndpoint(event)

    const tokens = await $fetch<OidcTokenResponse>(tokenEndpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: String(oauth.oidc.clientId),
        client_secret: String(oauth.oidc.clientSecret),
      }).toString(),
    }).catch((err) => {
      throw createError({
        statusCode: 401,
        message: `Token refresh failed: ${err?.data?.error_description ?? err?.data?.error ?? err?.message}`,
      })
    })

    if (!tokens.access_token) {
      throw createError({
        statusCode: 401,
        message: `Token refresh failed: ${tokens.error_description ?? tokens.error ?? 'invalid response'}`,
      })
    }

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? refreshToken,
      expiresAt: Date.now() + (tokens.expires_in ?? 3600) * 1000,
    }
  })()

  refreshInFlight.set(refreshToken, promise)

  // Удерживаем результат ещё немного на случай поздних параллельных вызовов,
  // затем чистим, чтобы не копить мусор и не использовать устаревшие токены.
  const cleanup = () => {
    setTimeout(() => {
      if (refreshInFlight.get(refreshToken) === promise)
        refreshInFlight.delete(refreshToken)
    }, INFLIGHT_TTL_MS)
  }
  promise.then(cleanup, () => {
    // При ошибке убираем сразу — следующий вызов должен попробовать заново
    if (refreshInFlight.get(refreshToken) === promise)
      refreshInFlight.delete(refreshToken)
  })

  return promise
}

/**
 * Returns a valid access token from session.
 * Automatically refreshes via OIDC if token is about to expire.
 * Parallel callers with the same refresh_token share a single refresh request.
 */
export async function getAccessToken(event: H3Event): Promise<string> {
  const session = await getUserSession(event)
  const { secure, tokenExpiresAt } = session

  if (!secure?.accessToken) {
    throw createError({ statusCode: 401, message: 'Not authenticated' })
  }

  // Токен ещё валиден (с запасом 30 сек)
  if (tokenExpiresAt && tokenExpiresAt - 30_000 > Date.now()) {
    return secure.accessToken
  }

  if (!secure.refreshToken) {
    throw createError({
      statusCode: 401,
      message: 'Session expired. Please log in again.',
    })
  }

  const refreshed = await performRefresh(event, secure.refreshToken)

  // Записываем результат в сессию текущего события. Если параллельный запрос
  // уже обновил токен через ту же in-flight Promise, мы получим тот же результат
  // и просто перепишем сессию идемпотентно.
  await replaceUserSession(event, {
    ...session,
    tokenExpiresAt: refreshed.expiresAt,
    secure: {
      ...secure,
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
    },
  })

  return refreshed.accessToken
}
