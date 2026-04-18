import { env } from 'node:process'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui', 'nuxt-auth-utils'],

  devtools: {
    enabled: true,
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    proxyTimeoutMs: env.NUXT_PROXY_TIMEOUT_MS ? Number(env.NUXT_PROXY_TIMEOUT_MS) : 15000,
    oauth: {
      oidc: {
        clientId: env.NUXT_OAUTH_OIDC_CLIENT_ID,
        clientSecret: env.NUXT_OAUTH_OIDC_CLIENT_SECRET,
        openidConfig: env.NUXT_OAUTH_OIDC_OPENID_CONFIG,
        redirectURL: env.NUXT_OAUTH_OIDC_REDIRECT_URL,
      },
    },
    public: {
      backendBaseUrl: env.NUXT_PUBLIC_BACKEND_BASE_URL || '',
      oidcPostLogoutUrl: env.NUXT_OIDC_POST_LOGOUT_REDIRECT_URL || '',
    },
    session: {
      password: env.NUXT_SESSION_PASSWORD || 'change-me-in-env-min-32-chars',
      maxAge: 60 * 60 * 24 * 7,
    },
  },

  routeRules: {
    '/': { prerender: true },
  },

  vite: {
    optimizeDeps: {
      include: [
        'valibot',
      ],
    },
  },

  compatibilityDate: '2025-01-15',

  typescript: {
    strict: true,
    typeCheck: true,
    tsConfig: {
      compilerOptions: {
        noUncheckedIndexedAccess: true,
        useUnknownInCatchVariables: true,
        noImplicitOverride: true,
      },
    },
  },

  eslint: {
    config: {
      standalone: false,
    },
  },
})
