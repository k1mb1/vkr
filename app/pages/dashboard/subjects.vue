<script setup lang="ts">
import CreateSubjectToolbarForm from '~/components/subjects/CreateSubjectToolbarForm.vue'

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
    <template #actions>
      <CreateSubjectToolbarForm />
    </template>

    <template #body>
      <NuxtPage />
    </template>
  </BaseDashboardPanel>
</template>
