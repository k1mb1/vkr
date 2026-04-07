type OidcRefreshResponse = {
  access_token: string
  refresh_token?: string
  expires_in?: number
}

type OidcDiscoveryResponse = {
  token_endpoint?: string
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const session = await getUserSession(event)

  const refreshToken = session.secure?.refreshToken
  if (!refreshToken) {
    throw createError({ statusCode: 401, statusMessage: 'Missing refresh token' })
  }

  const openidConfigUrl = config.oauth?.oidc?.openidConfig
  if (!openidConfigUrl || typeof openidConfigUrl !== 'string') {
    throw createError({ statusCode: 500, statusMessage: 'OIDC discovery URL is not configured' })
  }

  const discovery = await $fetch<OidcDiscoveryResponse>(openidConfigUrl)
  const tokenEndpoint = discovery?.token_endpoint

  if (!tokenEndpoint || typeof tokenEndpoint !== 'string') {
    throw createError({ statusCode: 500, statusMessage: 'OIDC token endpoint was not discovered' })
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: config.oauth.oidc.clientId,
    client_secret: config.oauth.oidc.clientSecret
  })

  let tokenResponse: OidcRefreshResponse
  try {
    tokenResponse = await $fetch<OidcRefreshResponse>(tokenEndpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded'
      },
      body
    })
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'Refresh token is invalid or expired' })
  }

  const now = Date.now()
  const tokenExpiresAt = now + (tokenResponse.expires_in ?? 3600) * 1000

  await replaceUserSession(event, {
    ...session,
    tokenExpiresAt,
    secure: {
      ...session.secure,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token ?? refreshToken
    }
  })

  return {
    ok: true,
    tokenExpiresAt
  }
})
