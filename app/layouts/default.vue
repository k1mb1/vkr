<script setup lang="ts">
const { loggedIn } = useUserSession()
const { logout } = useOidcAuth()
</script>

<template>
  <div class="min-h-svh flex flex-col">
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
      </template>

      <template #right>
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
      </template>
    </UHeader>

    <UMain class="flex-1">
      <slot />
    </UMain>

    <USeparator icon="i-simple-icons-nuxtdotjs" />

    <UFooter>
      <template #left>
        <p class="text-sm text-muted">
          Built with Nuxt UI • © {{ new Date().getFullYear() }}
        </p>
      </template>
    </UFooter>
  </div>
</template>
