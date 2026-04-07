type OidcUser = {
  sub?: string
  email?: string
  name?: string
  preferred_username?: string
}

type OidcTokens = {
  access_token?: string
  refresh_token?: string
  expires_in?: number
}

function sanitizeRedirect(input: unknown): string {
  const value = typeof input === 'string' ? input : '/dashboard'

  if (!value.startsWith('/') || value.startsWith('//')) {
    return '/dashboard'
  }

  const blocked = ['/auth/oidc', '/auth/login', '/auth/callback', '/auth-error', '/logout']
  if (blocked.includes(value)) {
    return '/dashboard'
  }

  return value
}

export default defineOAuthOidcEventHandler({
  config: {
    scope: ['openid', 'profile', 'email']
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
        name: oidcUser.name ?? oidcUser.preferred_username ?? oidcUser.email ?? oidcUser.sub
      },
      loggedInAt: now,
      tokenExpiresAt: expiresAt,
      secure: {
        accessToken: oidcTokens.access_token,
        refreshToken: oidcTokens.refresh_token
      }
    })

    return sendRedirect(event, redirectTo)
  },
  onError(event, error) {
    const message = encodeURIComponent(error?.message || 'OIDC authentication failed')
    return sendRedirect(event, `/auth-error?message=${message}`)
  }
})
