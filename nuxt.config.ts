// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui', 'nuxt-auth-utils'],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    oauth: {
      oidc: {
        clientId: process.env.NUXT_OAUTH_OIDC_CLIENT_ID,
        clientSecret: process.env.NUXT_OAUTH_OIDC_CLIENT_SECRET,
        openidConfig: process.env.NUXT_OAUTH_OIDC_OPENID_CONFIG,
        redirectURL: process.env.NUXT_OAUTH_OIDC_REDIRECT_URL
      }
    },
    public: {
      oidcPostLogoutUrl: process.env.NUXT_OIDC_POST_LOGOUT_REDIRECT_URL || ''
    },
    session: {
      maxAge: 60 * 60 * 24 * 7
    }
  },

  routeRules: {
    '/': { prerender: true }
  },

  compatibilityDate: '2025-01-15',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
