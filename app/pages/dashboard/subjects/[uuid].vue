<script setup lang="ts">
import type { SubjectResponse } from '#shared/types/backend'
import type { BreadcrumbItem } from '@nuxt/ui'
import type { NavigationMenuItem } from '@nuxt/ui'
import { useStudentsGroupsApi } from '~/composables/api'

const route = useRoute()
const subjectId = computed(() => String(route.params.uuid ?? ''))
const activeSubject = useState<SubjectResponse | null>('subjects-active-subject', () => null)

const subjectName = computed(() => {
  if (activeSubject.value?.id === subjectId.value && activeSubject.value.name)
    return activeSubject.value.name

  return 'Subject'
})

const breadcrumbItems = computed<BreadcrumbItem[]>(() => {
  return [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Subjects', to: '/dashboard/subjects' },
    { label: subjectName.value, to: `/dashboard/subjects/${subjectId.value}` }
  ]
})

const linksToolbar = computed(() => [{
  label: 'General',
  icon: 'i-lucide-user',
  to: `/dashboard/subjects/${subjectId.value}`,
  exact: true
}, {
  label: 'Settings',
  icon: 'i-lucide-bell',
  to: `/dashboard/subjects/${subjectId.value}/settings`
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

    <NuxtPage/>
  </NuxtLayout>
</template>
