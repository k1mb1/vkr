<script setup lang="ts">
definePageMeta({
  layout: 'dashboard'
})

const { user } = useOidcAuth()
</script>

<template>
  <BaseDashboardPanel
    id="dashboard-profile"
    title="Profile"
  >
    <template #body>
      <UCard>
        <div class="space-y-2 text-sm">
          <p><strong>sub:</strong> {{ user?.sub || 'n/a' }}</p>
          <p><strong>email:</strong> {{ user?.email || 'n/a' }}</p>
          <p><strong>name:</strong> {{ user?.name || 'n/a' }}</p>
          <p><strong>groups:</strong> {{ (user?.groups || []).join(', ') || 'none' }}</p>
        </div>
      </UCard>
    </template>
  </BaseDashboardPanel>
</template>
