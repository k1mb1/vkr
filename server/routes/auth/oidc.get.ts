interface OidcUser {
  sub?: string
  email?: string
  name?: string
  preferred_username?: string
  groups?: string[] | string
}

interface OidcTokens {
  access_token?: string
  refresh_token?: string
  expires_in?: number
}

function sanitizeRedirect(input: unknown): string {
  const value = typeof input === 'string' ? input : '/dashboard'

  if (!value.startsWith('/') || value.startsWith('//')) {
    return '/dashboard'
  }

  const blocked = ['/auth/oidc', '/auth/login', '/auth/callback', '/logout']
  if (blocked.includes(value)) {
    return '/dashboard'
  }

  return value
}

function normalizeGroups(input: string[] | string | undefined): string[] {
  if (!input) {
    return []
  }

  if (Array.isArray(input)) {
    return input
      .map(group => group.trim().toUpperCase())
      .filter(Boolean)
  }

  return input
    .split(/[\s,]+/)
    .map(group => group.trim().toUpperCase())
    .filter(Boolean)
}

export default defineOAuthOidcEventHandler({
  config: {
    scope: ['openid', 'profile', 'email', 'groups'],
  },
  async onSuccess(event, { user, tokens }) {
    const oidcUser = user as OidcUser
    const oidcTokens = tokens as OidcTokens

    const now = Date.now()
    const expiresAt = now + (oidcTokens.expires_in ?? 3600) * 1000
    const redirectTo = sanitizeRedirect(getQuery(event).redirect)

    await setUserSession(event, {
      user: {
        sub: oidcUser.sub,
        email: oidcUser.email,
        name: oidcUser.name ?? oidcUser.preferred_username ?? oidcUser.email ?? oidcUser.sub,
        groups: normalizeGroups(oidcUser.groups),
      },
      loggedInAt: now,
      tokenExpiresAt: expiresAt,
      secure: {
        accessToken: oidcTokens.access_token,
        refreshToken: oidcTokens.refresh_token,
      },
    })

    return sendRedirect(event, redirectTo)
  },
  onError(event, error) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: error?.message || 'OIDC authentication failed',
      data: {
        from: '/dashboard',
      },
    })
  },
})
