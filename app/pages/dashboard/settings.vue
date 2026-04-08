<script setup lang="ts">
definePageMeta({
  layout: 'dashboard'
})
</script>

<template>
  <BaseDashboardPanel
    id="dashboard-settings"
    title="Settings"
  >
    <template #body>
      <UCard>
        <UAlert
          color="neutral"
          variant="soft"
          icon="i-lucide-cog"
          title="Stub page"
          description="Use this page to add provider-scoped settings, profile sync and security controls."
        />
      </UCard>
    </template>
  </BaseDashboardPanel>
</template>
