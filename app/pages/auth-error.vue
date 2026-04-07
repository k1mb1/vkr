<script setup lang="ts">
const route = useRoute()

const errorMessage = computed(() => {
  const message = route.query.message
  return typeof message === 'string' ? decodeURIComponent(message) : 'Unknown authentication error'
})
</script>

<template>
  <UPage>
    <UPageSection
      title="Authentication error"
      description="The OIDC flow did not finish successfully."
      class="max-w-2xl mx-auto"
    >
      <UCard>
        <div class="space-y-4">
          <UAlert
            color="error"
            variant="soft"
            icon="i-lucide-triangle-alert"
            title="Login failed"
            :description="errorMessage"
          />

          <div class="flex gap-3">
            <UButton
              to="/auth/login"
              icon="i-lucide-rotate-ccw"
            >
              Try again
            </UButton>
            <UButton
              to="/"
              color="neutral"
              variant="outline"
            >
              Go home
            </UButton>
          </div>
        </div>
      </UCard>
    </UPageSection>
  </UPage>
</template>
