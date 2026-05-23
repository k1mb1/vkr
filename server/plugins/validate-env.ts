import { env } from 'node:process'

const REQUIRED_ENV = [
  'NUXT_SESSION_PASSWORD',
  'NUXT_OAUTH_OIDC_CLIENT_ID',
  'NUXT_OAUTH_OIDC_CLIENT_SECRET',
  'NUXT_OAUTH_OIDC_OPENID_CONFIG',
  'NUXT_OAUTH_OIDC_REDIRECT_URL',
] as const

export default defineNitroPlugin(() => {
  const missing: string[] = []
  for (const key of REQUIRED_ENV) {
    if (!env[key])
      missing.push(key)
  }

  if (missing.length > 0)
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)

  const sessionPassword = env.NUXT_SESSION_PASSWORD || ''
  if (sessionPassword.length < 32)
    throw new Error('NUXT_SESSION_PASSWORD must be at least 32 characters long')

  if (/^change[-_ ]?me/i.test(sessionPassword))
    throw new Error('NUXT_SESSION_PASSWORD must not use the default placeholder value')

  // In production the browser-facing site origin must be set so CORS and
  // backend URL configuration are unambiguous.
  if (env.NODE_ENV === 'production') {
    const siteOrigin = env.NUXT_PUBLIC_SITE_ORIGIN
    if (!siteOrigin)
      throw new Error('NUXT_PUBLIC_SITE_ORIGIN must be set in production')

    try {
      const url = new URL(siteOrigin)
      if (url.protocol !== 'https:')
        throw new Error('NUXT_PUBLIC_SITE_ORIGIN must use https in production')
    }
    catch {
      throw new Error('NUXT_PUBLIC_SITE_ORIGIN must be a valid URL')
    }

    if (!env.NUXT_PUBLIC_BACKEND_BASE_URL)
      throw new Error('NUXT_PUBLIC_BACKEND_BASE_URL must be set in production')
  }
})
