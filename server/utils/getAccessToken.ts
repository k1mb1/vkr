import type { H3Event } from 'h3'

interface OidcTokenResponse {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  error?: string
  error_description?: string
}

// Кешируем endpoint в памяти — нет смысла ходить на discovery при каждом запросе
let cachedTokenEndpoint: string | null = null

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

/**
 * Returns a valid access token from session.
 * Automatically refreshes via OIDC if token is about to expire.
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

  const { oauth } = useRuntimeConfig(event)
  const tokenEndpoint = await resolveTokenEndpoint(event)

  const tokens = await $fetch<OidcTokenResponse>(tokenEndpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: secure.refreshToken,
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

  await replaceUserSession(event, {
    ...session,
    tokenExpiresAt: Date.now() + (tokens.expires_in ?? 3600) * 1000,
    secure: {
      ...secure,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? secure.refreshToken,
    },
  })

  return tokens.access_token
}
