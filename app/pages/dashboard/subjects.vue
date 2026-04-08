<script setup lang="ts">
definePageMeta({
  layout: 'dashboard'
})
</script>

<template>
  <BaseDashboardPanel
    id="dashboard-subjects"
    title="Subjects"
  >
    <template #body>
      <UPageCard title="Subjects module is ready for integration with useSubjectsApi." />
    </template>
  </BaseDashboardPanel>
</template>
