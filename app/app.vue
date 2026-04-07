<script setup>
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

const title = 'Nuxt OIDC Starter'
const description = 'Nuxt UI + nuxt-auth-utils scaffold for Pocket ID and OIDC flows with protected pages and token refresh.'

const { loggedIn, user } = useUserSession()
const { logout } = useOidcAuth()

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogImage: 'https://ui.nuxt.com/assets/cover.jpg',
  twitterImage: 'https://ui.nuxt.com/assets/cover.jpg',
  twitterCard: 'summary_large_image'
})
</script>

<template>
  <UApp>
    <UHeader>
      <template #left>
        <NuxtLink to="/">
          <AppLogo class="w-auto h-6 shrink-0" />
        </NuxtLink>

        <UButton
          to="/dashboard"
          variant="ghost"
          color="neutral"
          icon="i-lucide-layout-dashboard"
          size="sm"
        >
          Dashboard
        </UButton>
        <UButton
          to="/profile"
          variant="ghost"
          color="neutral"
          icon="i-lucide-user"
          size="sm"
        >
          Profile
        </UButton>
        <UButton
          to="/settings"
          variant="ghost"
          color="neutral"
          icon="i-lucide-settings"
          size="sm"
        >
          Settings
        </UButton>
        <UButton
          to="/groups-demo"
          variant="ghost"
          color="neutral"
          icon="i-lucide-users"
          size="sm"
        >
          Groups Demo
        </UButton>
        <UButton
          to="/admin"
          variant="ghost"
          color="neutral"
          icon="i-lucide-shield"
          size="sm"
        >
          Admin
        </UButton>
      </template>

      <template #right>
        <UBadge
          v-if="loggedIn"
          color="success"
          variant="soft"
          class="hidden sm:inline-flex"
        >
          {{ user?.email || user?.name || 'Signed in' }}
        </UBadge>

        <UButton
          v-if="loggedIn"
          icon="i-lucide-log-out"
          color="neutral"
          variant="soft"
          @click="logout"
        >
          Logout
        </UButton>

        <UButton
          v-else
          to="/auth/login"
          icon="i-lucide-log-in"
        >
          Login
        </UButton>

        <UColorModeButton />

        <UButton
          to="https://github.com/atinux/nuxt-auth-utils"
          target="_blank"
          icon="i-simple-icons-github"
          aria-label="nuxt-auth-utils"
          color="neutral"
          variant="ghost"
        />
      </template>
    </UHeader>

    <UMain>
      <NuxtPage />
    </UMain>

    <USeparator icon="i-simple-icons-nuxtdotjs" />

    <UFooter>
      <template #left>
        <p class="text-sm text-muted">
          Built with Nuxt UI • © {{ new Date().getFullYear() }}
        </p>
      </template>

      <template #right>
        <UButton
          to="https://github.com/atinux/nuxt-auth-utils"
          target="_blank"
          icon="i-simple-icons-github"
          aria-label="nuxt-auth-utils"
          color="neutral"
          variant="ghost"
        />
      </template>
    </UFooter>
  </UApp>
</template>
