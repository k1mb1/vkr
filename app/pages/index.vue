<template>
  <div>
    <UPageHero
      title="Nuxt + Pocket ID OIDC Scaffold"
      description="Server-first authentication setup with Nuxt UI and nuxt-auth-utils, including protected routes, token refresh endpoint and stub pages."
      :links="[{
        label: 'Sign in',
        to: '/auth/login',
        icon: 'i-lucide-log-in',
        size: 'xl'
      }, {
        label: 'Open dashboard',
        to: '/dashboard',
        icon: 'i-lucide-layout-dashboard',
        size: 'xl',
        color: 'neutral',
        variant: 'subtle'
      }]"
    />

    <UPageSection
      id="features"
      title="What is already wired"
      description="Core OIDC paths and token lifecycle hooks are scaffolded and ready for Pocket ID values."
      :features="[{
        icon: 'i-lucide-shield-check',
        title: 'OIDC auth route',
        description: '/auth/oidc uses defineOAuthOidcEventHandler and stores a minimal user session.'
      }, {
        icon: 'i-lucide-refresh-cw',
        title: 'Server-side token refresh',
        description: 'Backend requests go through /api/proxy, where access tokens are validated and refreshed automatically.'
      }, {
        icon: 'i-lucide-lock-keyhole',
        title: 'Global protected routes',
        description: 'All pages are protected by default except / and auth utility routes.'
      }, {
        icon: 'i-lucide-layout-dashboard',
        title: 'Stub pages in place',
        description: 'Login, callback, dashboard, profile, settings, auth error and logout pages are ready to extend.'
      }, {
        icon: 'i-lucide-sliders-horizontal',
        title: 'Composable API',
        description: 'useOidcAuth() provides login, logout, refreshNow and session state for UI pages.'
      }]"
    />

    <UPageSection>
      <UPageCTA
        title="Next step: add your Pocket ID credentials"
        description="Copy env values from .env.example, configure callback URL in provider settings, then test /auth/login flow."
        variant="subtle"
        :links="[{
          label: 'Go to login',
          to: '/auth/login',
          icon: 'i-lucide-log-in',
          color: 'neutral',
          trailingIcon: 'i-lucide-arrow-right'
        }, {
          label: 'Open profile stub',
          to: '/dashboard/profile',
          icon: 'i-lucide-user',
          color: 'neutral',
          variant: 'outline'
        }]"
      />
    </UPageSection>
  </div>
</template>
