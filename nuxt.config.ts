import { env } from 'node:process'

export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui', 'nuxt-auth-utils', '@pinia/nuxt', '@nuxtjs/i18n', 'nuxt-open-fetch', 'nuxt-security'],

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
      password: env.NUXT_SESSION_PASSWORD ?? '',
      maxAge: 60 * 60 * 24 * 7,
      name: env.NODE_ENV === 'production' ? '__Host-session' : 'nuxt-session',
      cookie: {
        sameSite: 'lax',
        secure: env.NODE_ENV === 'production',
        httpOnly: true,
        path: '/',
      },
    },
  },

  routeRules: {
    '/auth/oidc': {
      security: {
        rateLimiter: { tokensPerInterval: 20, interval: 60_000, throwError: true },
      },
    },
    '/api/auth/refresh': {
      security: {
        rateLimiter: { tokensPerInterval: 30, interval: 60_000, throwError: true },
      },
    },
    '/api/proxy/**': {
      security: {
        xssValidator: false,
        requestSizeLimiter: { maxRequestSizeInBytes: 4_000_000, maxUploadFileRequestInBytes: 16_000_000, throwError: true },
      },
    },
  },

  security: {
    headers: {
      contentSecurityPolicy: {
        'base-uri': ['\'none\''],
        'default-src': ['\'self\''],
        'script-src': ['\'self\'', '\'nonce-{{nonce}}\'', '\'strict-dynamic\''],
        'style-src': ['\'self\'', '\'unsafe-inline\''],
        'img-src': ['\'self\'', 'data:', 'blob:', 'https://api.dicebear.com'],
        'font-src': ['\'self\'', 'data:'],
        'connect-src': ['\'self\''],
        'form-action': ['\'self\''],
        'frame-ancestors': ['\'none\''],
        'object-src': ['\'none\''],
        'upgrade-insecure-requests': env.NODE_ENV === 'production',
      },
      crossOriginEmbedderPolicy: 'credentialless',
      crossOriginOpenerPolicy: 'same-origin',
      crossOriginResourcePolicy: 'same-origin',
      referrerPolicy: 'strict-origin-when-cross-origin',
      strictTransportSecurity: env.NODE_ENV === 'production'
        ? { maxAge: 15_552_000, includeSubdomains: true, preload: true }
        : false,
      xContentTypeOptions: 'nosniff',
      xFrameOptions: 'DENY',
      xXSSProtection: '0',
      permissionsPolicy: {
        camera: [],
        microphone: [],
        geolocation: [],
      },
    },
    requestSizeLimiter: {
      maxRequestSizeInBytes: 2_000_000,
      maxUploadFileRequestInBytes: 8_000_000,
      throwError: true,
    },
    rateLimiter: {
      tokensPerInterval: 150,
      interval: 60_000,
      headers: false,
      driver: { name: 'lruCache' },
      throwError: true,
    },
    xssValidator: {
      throwError: true,
    },
    corsHandler: {
      // Browser only ever talks to this Nuxt origin (backend is reached
      // server-side through /api/proxy/**). Lock CORS to the site origin in
      // prod; in dev, fall back to localhost.
      origin: env.NUXT_PUBLIC_SITE_ORIGIN
        ? [env.NUXT_PUBLIC_SITE_ORIGIN]
        : env.NODE_ENV === 'production'
          ? []
          : ['http://localhost:3000', 'http://front.localhost'],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      credentials: true,
    },
    nonce: true,
    removeLoggers: env.NODE_ENV === 'production' ? { external: [] } : false,
    hidePoweredBy: true,
    enabled: true,
    ssg: {
      hashScripts: true,
      hashStyles: false,
    },
  },

  vite: {
    optimizeDeps: {
      include: [
        'valibot',
        '@internationalized/date',
        '@vueuse/integrations/useQRCode',
        '@vueuse/core',
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

  i18n: {
    strategy: 'no_prefix',
    defaultLocale: 'ru',
    vueI18n: 'i18n.config.ts',
    detectBrowserLanguage: {
      useCookie: true,
      redirectOn: 'root',
      alwaysRedirect: true,
    },
    locales: [{
      code: 'en',
      name: 'English',
    }, {
      code: 'ru',
      name: 'Русский',
    }],
  },

  openFetch: {
    clients: {
      backend: {
        schema: './openapi/api-docs.json',
        baseURL: '/api/proxy',
      },
    },
  },
})
