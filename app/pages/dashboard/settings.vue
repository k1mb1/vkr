<script setup lang="ts">
definePageMeta({
  layout: 'dashboard'
})

const requiresAuth = ref(true)
</script>

<template>
  <BaseDashboardPanel
    id="dashboard-settings"
    title="Settings"
  >
    <template #body>
      <UPageCard title="Session preferences">
        <div class="space-y-4">
          <UFormField label="Require auth for backend debug requests">
            <USwitch v-model="requiresAuth" />
          </UFormField>

          <p class="text-sm text-muted">
            This is a placeholder settings page. You can extend it with real preferences.
          </p>
        </div>
      </UPageCard>
    </template>
  </BaseDashboardPanel>
</template>
