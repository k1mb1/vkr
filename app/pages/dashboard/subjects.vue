<script setup lang="ts">
import type { BreadcrumbItem, NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()
const { subjects } = useSubjectNavigation()

const uuid = computed(() => {
  const param = route.params.uuid
  return typeof param === 'string' ? param : null
})

const activeSubjectName = computed(() =>
  uuid.value ? (subjects.value.find(s => s.id === uuid.value)?.name ?? null) : null,
)

const breadcrumbItems = computed<BreadcrumbItem[]>(() => {
  const items: BreadcrumbItem[] = [
    { label: 'Главная', to: '/dashboard' },
    { label: 'Предметы', to: '/dashboard/subjects' },
  ]

  if (route.path === '/dashboard/subjects/create') {
    items.push({ label: 'Создание' })
  }
  else if (uuid.value) {
    items.push({
      label: activeSubjectName.value ?? 'Предмет',
      to: `/dashboard/subjects/${uuid.value}`,
    })
  }

  return items
})

const toolbarItems = computed<NavigationMenuItem[][]>(() => uuid.value
  ? [[
      {
        label: 'Таблица',
        icon: 'i-lucide-table',
        to: `/dashboard/subjects/${uuid.value}`,
      },
      {
        label: 'Назначение',
        icon: 'i-lucide-table',
        to: `/dashboard/subjects/${uuid.value}/teaching`,
      },
      {
        label: 'Назначение',
        icon: 'i-lucide-table',
        to: `/dashboard/subjects/${uuid.value}/lessons`,
      },
    ]]
  : [])
</script>

<template>
  <NuxtLayout
    name="dashboard"
    panel-id="dashboard-subjects"
    :navbar-ui="{ right: 'gap-3' }"
  >
    <template #navbar-title>
      <UBreadcrumb :items="breadcrumbItems" />
    </template>
    <template v-if="toolbarItems.length" #toolbar>
      <UNavigationMenu :items="toolbarItems" highlight class="-mx-1 flex-1" />
    </template>
    <NuxtPage />
  </NuxtLayout>
</template>
