<script setup lang="ts">
definePageMeta({
  layout: 'dashboard'
})

const { user, session, refreshNow } = useOidcAuth()

const refreshing = ref(false)
const refreshError = ref<string | null>(null)
const teacherSyncError = useState<string | null>('teacher-sync-error', () => null)

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
  <BaseDashboardPanel
    id="dashboard-home"
    title="Dashboard"
  >
    <template #body>
      <UPageCard title="Session snapshot">
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

          <UAlert
            v-if="teacherSyncError"
            color="warning"
            variant="soft"
            :description="teacherSyncError"
            title="Teacher sync"
          />

          <UButton
            :loading="refreshing"
            icon="i-lucide-refresh-cw"
            @click="runRefresh"
          >
            Refresh token now
          </UButton>
        </div>
      </UPageCard>
    </template>
  </BaseDashboardPanel>
</template>
