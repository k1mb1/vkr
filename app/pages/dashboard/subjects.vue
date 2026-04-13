<script setup lang="ts">
definePageMeta({
  layout: 'dashboard'
})
</script>

<template>
  <BaseDashboardPanel
    id="dashboard-subjects"
    :items="[
      { label: 'Dashboard', to: '/dashboard' },
      { label: 'Subjects', to: '/dashboard/subjects' }
    ]"
  >
    <template #body>
      <NuxtPage />
    </template>
  </BaseDashboardPanel>
</template>
