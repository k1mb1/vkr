<script setup lang="ts">
import type { BreadcrumbItem } from '@nuxt/ui'
import { getDashboardPrimaryLinks } from '~/composables/useDashboardNavigation'

const cards = computed(() => getDashboardPrimaryLinks())

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

    <UPageGrid>
      <UPageCard
        v-for="(card, index) in cards"
        :key="`${card.label}-${index}`"
        :to="card.to"
        :target="card.target"
        :icon="card.icon"
        :title="card.label"
        :description="card.description"
      />
    </UPageGrid>
  </NuxtLayout>
</template>
