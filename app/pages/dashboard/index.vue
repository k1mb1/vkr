<script setup lang="ts">
import type { BreadcrumbItem } from '@nuxt/ui'

const breadcrumbItems = computed<BreadcrumbItem[]>(() => {
  return [
    { label: 'Dashboard', to: '/dashboard' },
  ]
})
</script>

<template>
  <NuxtLayout name="dashboard" panel-id="dashboard-home" panel-title="Dashboard">
    <template #navbar-title>
      <UBreadcrumb :items="breadcrumbItems" />
    </template>
    <template #default>
      <!-- TODO -->
    </template>
  </nuxtlayout>
</template>
