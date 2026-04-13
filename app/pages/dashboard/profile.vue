<script setup lang="ts">
definePageMeta({
  layout: 'dashboard'
})

const { user, session } = useOidcAuth()
</script>

<template>
  <BaseDashboardPanel
    id="dashboard-profile"
    title="Profile"
  >
    <template #body>
      <UPageCard title="User profile">
        <div class="space-y-3 text-sm text-muted">
          <p>Name: {{ user?.name || 'n/a' }}</p>
          <p>Email: {{ user?.email || 'n/a' }}</p>
          <p>Subject: {{ user?.sub || 'n/a' }}</p>
          <p>Expires at: {{ session?.tokenExpiresAt || 'n/a' }}</p>
        </div>
      </UPageCard>
    </template>
  </BaseDashboardPanel>
</template>
