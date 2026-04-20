<script setup lang="ts">
import type { BreadcrumbItem } from '@nuxt/ui'

const breadcrumbItems = computed<BreadcrumbItem[]>(() => {
  return [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Subjects', to: '/dashboard/subjects' },
  ]
})
</script>

<template>
  <NuxtLayout name="dashboard" panel-id="dashboard-subjects" panel-title="Subjects">
    <template #navbar-title>
      <UBreadcrumb :items="breadcrumbItems" />
    </template>

    <template #navbar-right>
      <SubjectsCreateToolbarForm />
    </template>

    <NuxtPage />
  </NuxtLayout>
</template>
