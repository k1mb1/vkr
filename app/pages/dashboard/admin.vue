<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['group'],
  requiredGroups: ['ADMIN', 'MANAGER']
})
</script>

<template>
  <BaseDashboardPanel
    id="dashboard-admin"
    title="Admin area"
  >
    <template #body>
      <UCard>
        <p>Welcome to admin-only section.</p>
      </UCard>
    </template>
  </BaseDashboardPanel>
</template>
