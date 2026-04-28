<script setup lang="ts">
import type { SubjectResponse } from '#shared/types/backend'
import type { BreadcrumbItem, NavigationMenuItem } from '@nuxt/ui'
import { useSubjectsStore } from '~/stores/subjects'

const subjectsStore = useSubjectsStore()
const route = useRoute()
const router = useRouter()
const subjectId = computed(() => String(route.params.subjectId ?? ''))

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

  return 'Предмет'
})

onMounted(() => {
  if (route.path === `/dashboard/subjects/${subjectId.value}`) {
    router.replace(`/dashboard/subjects/${subjectId.value}/grades`)
  }
})

onUnmounted(() => {
  subjectsStore.setActiveSubject(null)
})

const breadcrumbItems = computed<BreadcrumbItem[]>(() => {
  return [
    { label: 'Предметы', to: '/dashboard/subjects' },
    { label: subjectName.value, to: `/dashboard/subjects/${subjectId.value}` },
  ]
})

const linksToolbar = computed(() => [
  {
    label: 'Оценки',
    icon: 'i-lucide-table',
    to: `/dashboard/subjects/${subjectId.value}/grades`,
    exact: true,
  },
  {
    label: 'Посещаемость',
    icon: 'i-lucide-calendar-check',
    to: `/dashboard/subjects/${subjectId.value}/attendance`,
  },
  {
    label: 'Занятия',
    icon: 'i-lucide-book-open',
    to: `/dashboard/subjects/${subjectId.value}/lessons`,
  },
  {
    label: 'Итоги',
    icon: 'i-lucide-trophy',
    to: `/dashboard/subjects/${subjectId.value}/final-grades`,
  },
  {
    label: 'Настройки',
    icon: 'i-lucide-settings',
    to: `/dashboard/subjects/${subjectId.value}/settings`,
  },
] satisfies NavigationMenuItem[])
</script>

<template>
  <NuxtLayout name="dashboard" panel-id="dashboard-subjects" panel-title="Предметы">
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
