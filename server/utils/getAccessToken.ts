import type { H3Event } from 'h3'

interface OidcDiscoveryResponse {
  token_endpoint?: string
}

interface OidcRefreshResponse {
  access_token: string
  refresh_token?: string
  expires_in?: number
  error?: string
  error_description?: string
}

async function resolveTokenEndpoint(event: H3Event): Promise<string> {
  const config = useRuntimeConfig(event)
  const openidConfig = config.oauth?.oidc?.openidConfig

  if (!openidConfig) {
    throw createError({ statusCode: 500, message: 'OIDC discovery URL is not configured' })
  }

  if (typeof openidConfig !== 'string') {
    throw createError({ statusCode: 500, message: 'Invalid OIDC discovery config' })
  }

  const discovery = await $fetch<OidcDiscoveryResponse>(openidConfig)
  const tokenEndpoint = discovery?.token_endpoint

  if (!tokenEndpoint) {
    throw createError({ statusCode: 500, message: 'OIDC token endpoint was not discovered' })
  }

  return tokenEndpoint
}

/**
 * Returns a valid access token from session.
 * If expired, automatically refreshes through OIDC and updates session.
 */
export async function getAccessToken(event: H3Event): Promise<string> {
  const session = await getUserSession(event)
  const secure = session.secure

  if (!secure?.accessToken) {
    throw createError({ statusCode: 401, message: 'Not authenticated' })
  }

  const nowMs = Date.now()
  const tokenExpiresAt = session.tokenExpiresAt

  if (tokenExpiresAt && tokenExpiresAt - 30_000 > nowMs) {
    return secure.accessToken
  }

  if (!secure.refreshToken) {
    throw createError({ statusCode: 401, message: 'Session expired. Please log in again.' })
  }

  const config = useRuntimeConfig(event)
  const tokenEndpoint = await resolveTokenEndpoint(event)

  const newTokens = await $fetch<OidcRefreshResponse>(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: secure.refreshToken,
      client_id: String(config.oauth.oidc.clientId),
      client_secret: String(config.oauth.oidc.clientSecret),
    }).toString(),
  }).catch((error) => {
    throw createError({
      statusCode: 401,
      message: `Token refresh failed: ${error?.data?.error_description ?? error?.data?.error ?? error?.message}`,
    })
  })

  if (newTokens.error || !newTokens.access_token) {
    throw createError({
      statusCode: 401,
      message: `Token refresh failed: ${newTokens.error_description ?? newTokens.error ?? 'invalid refresh response'}`,
    })
  }

  const expiresInMs = (newTokens.expires_in ?? 3600) * 1000
  const nextExpiresAt = Date.now() + expiresInMs

  await replaceUserSession(event, {
    ...session,
    tokenExpiresAt: nextExpiresAt,
    secure: {
      ...secure,
      accessToken: newTokens.access_token,
      refreshToken: newTokens.refresh_token ?? secure.refreshToken,
    },
  })

  return newTokens.access_token
}
