<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const links = [
  [
    {
      label: 'Уроки',
      icon: 'i-lucide-book-open-check',
      to: '/dashboard/subjects',
      exact: true,
    },
    {
      label: 'Студенты',
      icon: 'i-lucide-users',
      to: '/dashboard/subjects',
    },
  ],
] satisfies NavigationMenuItem[][]
</script>

<template>
  <NuxtLayout name="dashboard" panel-id="dashboard-subjects" panel-title="Subjects">
    <template #navbar-right>
      <SubjectsCreateSubjectToolbarForm />
    </template>

    <template #toolbar>
      <UNavigationMenu :items="links" />
    </template>

    <NuxtPage />
  </NuxtLayout>
</template>
