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
    <template #default>
      <div class="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <NuxtLink
          v-for="(card, index) in cards"
          :key="`${card.label}-${index}`"
          :to="card.to"
          :target="card.target"
          class="group block"
        >
          <UCard
            :ui="{
              body: 'flex items-start gap-4 p-5',
              root: 'h-full transition-all duration-200 group-hover:ring-2 group-hover:ring-primary/40 group-hover:-translate-y-0.5',
            }"
          >
            <div class="rounded-lg bg-primary/10 p-2 text-primary">
              <UIcon :name="card.icon" class="size-5" />
            </div>

            <div class="space-y-1">
              <h3 class="text-base font-semibold leading-5">
                {{ card.label }}
              </h3>
              <p class="text-sm text-(--ui-text-muted)">
                {{ card.description }}
              </p>
            </div>
          </UCard>
        </NuxtLink>
      </div>
    </template>
  </NuxtLayout>
</template>
