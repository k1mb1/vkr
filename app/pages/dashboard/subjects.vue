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
      <UCard>
        <p class="text-sm text-muted">
          Subjects module is ready for integration with useSubjectsApi.
        </p>
      </UCard>
    </template>
  </BaseDashboardPanel>
</template>
