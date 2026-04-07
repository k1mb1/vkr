<script setup lang="ts">
const route = useRoute()
const { login, loggedIn } = useOidcAuth()

const redirectTo = computed(() => {
  return typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard'
})

if (loggedIn.value) {
  await navigateTo(redirectTo.value)
}
</script>

<template>
  <UPage>
    <UPageSection
      title="Sign in"
      description="OIDC login via Pocket ID provider."
      class="max-w-2xl mx-auto"
    >
      <UCard>
        <template #header>
          <div class="flex items-center justify-between gap-4">
            <h2 class="text-lg font-semibold">
              Pocket ID
            </h2>
            <UBadge
              color="neutral"
              variant="soft"
            >
              OIDC
            </UBadge>
          </div>
        </template>

        <div class="space-y-4">
          <UAlert
            icon="i-lucide-shield-check"
            color="info"
            variant="soft"
            title="Server-side session"
            description="После входа сессия хранится в sealed cookie через nuxt-auth-utils."
          />

          <UButton
            block
            size="lg"
            icon="i-lucide-log-in"
            @click="login(redirectTo)"
          >
            Continue with Pocket ID
          </UButton>
        </div>
      </UCard>
    </UPageSection>
  </UPage>
</template>
