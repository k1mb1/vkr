<script setup lang="ts">
const route = useRoute()

const providerLogoutUrl = useRuntimeConfig().public.oidcPostLogoutUrl

const canFederatedLogout = computed(() => {
  return Boolean(providerLogoutUrl)
})

const target = computed(() => {
  if (!providerLogoutUrl) {
    return '/'
  }

  const queryRedirect = route.query.redirect
  const postLogoutPath = typeof queryRedirect === 'string' && queryRedirect.startsWith('/')
    ? queryRedirect
    : '/'

  const separator = providerLogoutUrl.includes('?') ? '&' : '?'
  return `${providerLogoutUrl}${separator}post_logout_redirect_uri=${encodeURIComponent(postLogoutPath)}`
})
</script>

<template>
  <UPage>
    <UPageSection
      title="You are logged out"
      description="Local session has been cleared."
    >
      <UCard :ui="{ body: 'flex flex-col gap-4' }">
        <UAlert
          color="success"
          variant="soft"
          icon="i-lucide-check-circle-2"
          title="Logout complete"
          description="You can sign in again or return to the home page."
        />

        <div class="flex gap-3 flex-wrap">
          <UButton
            to="/auth/login"
            icon="i-lucide-log-in"
          >
            Sign in again
          </UButton>
          <UButton
            to="/"
            color="neutral"
            variant="outline"
          >
            Home
          </UButton>
          <UButton
            v-if="canFederatedLogout"
            :to="target"
            external
            color="neutral"
            variant="soft"
            icon="i-lucide-external-link"
          >
            Provider logout
          </UButton>
        </div>
      </UCard>
    </UPageSection>
  </UPage>
</template>
