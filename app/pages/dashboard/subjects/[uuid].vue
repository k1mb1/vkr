<script setup lang="ts">
import type { SubjectResponse } from '#shared/types/backend'
import type { BreadcrumbItem, NavigationMenuItem } from '@nuxt/ui'
import { useSubjectsStore } from '~/stores/subjects'

const subjectsStore = useSubjectsStore()
const route = useRoute()
const subjectId = computed(() => String(route.params.uuid ?? ''))

const subjectFromStoreLists = computed<SubjectResponse | null>(() => {
  const id = subjectId.value
  if (!id)
    return null

  return subjectsStore.activeSubjects.find(s => s.id === id)
    ?? subjectsStore.archivedSubjects.find(s => s.id === id)
    ?? null
})

const subjectName = computed(() => {
  if (subjectsStore.activeSubject?.id === subjectId.value && subjectsStore.activeSubject.name)
    return subjectsStore.activeSubject.name

  if (subjectFromStoreLists.value?.name)
    return subjectFromStoreLists.value.name

  return 'Subject'
})

onUnmounted(() => {
  subjectsStore.setActiveSubject(null)
})

const breadcrumbItems = computed<BreadcrumbItem[]>(() => {
  return [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Subjects', to: '/dashboard/subjects' },
    { label: subjectName.value, to: `/dashboard/subjects/${subjectId.value}` },
  ]
})

const linksToolbar = computed(() => [{
  label: 'General',
  icon: 'i-lucide-user',
  to: `/dashboard/subjects/${subjectId.value}`,
  exact: true,
}, {
  label: 'Lessons',
  icon: 'i-lucide-book-open',
  to: `/dashboard/subjects/${subjectId.value}/lessons`,
}, {
  label: 'Settings',
  icon: 'i-lucide-bell',
  to: `/dashboard/subjects/${subjectId.value}/settings`,
}] satisfies NavigationMenuItem[])
</script>

<template>
  <NuxtLayout name="dashboard" panel-id="dashboard-subjects" panel-title="Subjects">
    <template #navbar-title>
      <UBreadcrumb :items="breadcrumbItems" />
    </template>

    <template #navbar-right>
      <SubjectsCreateToolbarForm />
    </template>

    <template #toolbar>
      <UNavigationMenu :items="linksToolbar" highlight class="-mx-1 flex-1" />
    </template>

    <NuxtPage />
  </NuxtLayout>
</template>
