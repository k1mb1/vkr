<script setup lang="ts">
const { user, session, refreshNow } = useOidcAuth()

const refreshing = ref(false)
const refreshError = ref<string | null>(null)

type ApiErrorPayload = {
  statusMessage?: string
}

type ApiError = {
  data?: ApiErrorPayload
}

async function runRefresh() {
  refreshing.value = true
  refreshError.value = null

  try {
    await refreshNow()
  } catch (error: unknown) {
    const apiError = error as ApiError
    refreshError.value = apiError.data?.statusMessage || 'Refresh failed'
  } finally {
    refreshing.value = false
  }
}
</script>

<template>
  <UPage>
    <UPageSection
      title="Dashboard"
      description="Protected page stub"
    >
      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold">
            Session snapshot
          </h2>
        </template>

        <div class="space-y-4">
          <p class="text-sm text-muted">
            User: {{ user?.name || user?.email || user?.sub }}
          </p>
          <p class="text-sm text-muted">
            Token expires at: {{ session?.tokenExpiresAt || 'n/a' }}
          </p>

          <UAlert
            v-if="refreshError"
            color="error"
            variant="soft"
            :description="refreshError"
            title="Refresh error"
          />

          <UButton
            :loading="refreshing"
            icon="i-lucide-refresh-cw"
            @click="runRefresh"
          >
            Refresh token now
          </UButton>
        </div>
      </UCard>
    </UPageSection>
  </UPage>
</template>
