<script setup lang="ts">
import type { ButtonProps } from '@nuxt/ui'

const route = useRoute()
const { login, loggedIn } = useOidcAuth()

const redirectTo = computed(() => {
  return typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard'
})

const providers = computed<ButtonProps[]>(() => [
  {
    label: 'Continue with Pocket ID',
    icon: 'i-lucide-log-in',
    color: 'neutral',
    variant: 'soft',
    block: true,
    onClick: async () => {
      await login(redirectTo.value)
    },
  },
])

if (loggedIn.value) {
  await navigateTo(redirectTo.value)
}
</script>

<template>
  <UPage>
    <UPageSection
      title="Sign in"
      description="OIDC login via Pocket ID provider."
      class="max-w-xl mx-auto"
    >
      <UPageCard>
        <UAuthForm
          title="Pocket ID"
          description="OIDC login with server-side sealed session."
          icon="i-lucide-shield-check"
          :providers="providers"
          separator=" "
        >
          <template #footer>
            Session is stored in sealed cookie via nuxt-auth-utils.
          </template>
        </UAuthForm>
      </UPageCard>
    </UPageSection>
  </UPage>
</template>
