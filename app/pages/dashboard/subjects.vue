<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { provideSubjectsBreadcrumbLabel, useSubjectsBreadcrumbItems } from '~/composables/useSubjectsBreadcrumbItems'

const activeSubjectName = provideSubjectsBreadcrumbLabel()
const breadcrumbItems = useSubjectsBreadcrumbItems(activeSubjectName)

const route = useRoute()
const uuid = computed(() => route.params.uuid as string | undefined)

const links = computed(() => [
  [
    {
      label: 'Предмет',
      icon: 'i-lucide-book-open-check',
      to: `/dashboard/subjects/${uuid.value}`,
      exact: true,
    },
    {
      label: 'Настройки',
      icon: 'i-lucide-settings',
      to: `/dashboard/subjects/${uuid.value}/settings`,
    },
  ],
] satisfies NavigationMenuItem[][])
</script>

<template>
  <NuxtLayout name="dashboard" panel-id="dashboard-subjects" panel-title="Subjects">
    <template #navbar-title>
      <UBreadcrumb :items="breadcrumbItems" />
    </template>

    <template #navbar-right>
      <SubjectsCreateSubjectToolbarForm />
    </template>

    <template v-if="uuid" #toolbar>
      <UNavigationMenu :items="links" />
    </template>

    <NuxtPage />
  </NuxtLayout>
</template>
