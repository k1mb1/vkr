<script setup lang="ts">
import type { BreadcrumbItem, NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()
const { subjects } = useSubjectNavigation()

const uuid = computed(() => {
  const param = route.params.uuid
  return typeof param === 'string' ? param : null
})

const permId = computed(() => {
  const param = route.params.id
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
    return items
  }

  if (uuid.value) {
    items.push({
      label: activeSubjectName.value ?? 'Предмет',
      to: `/dashboard/subjects/${uuid.value}`,
    })

    if (route.path.includes('/permissions')) {
      items.push({ label: 'Назначения', to: `/dashboard/subjects/${uuid.value}/permissions` })
      if (route.path.endsWith('/create')) {
        items.push({ label: 'Создание' })
      }
      else if (permId.value && route.path.endsWith('/edit')) {
        items.push({ label: 'Редактирование' })
      }
    }
    else if (route.path.includes('/lessons')) {
      items.push({ label: 'Занятия' })
    }
  }

  return items
})

const toolbarItems = computed<NavigationMenuItem[][]>(() => uuid.value
  ? [[
      {
        label: 'Обзор',
        icon: 'i-lucide-layout-dashboard',
        to: `/dashboard/subjects/${uuid.value}`,
        active: route.path === `/dashboard/subjects/${uuid.value}`,
      },
      {
        label: 'Назначения',
        icon: 'i-lucide-shield-check',
        to: `/dashboard/subjects/${uuid.value}/permissions`,
        active: route.path.startsWith(`/dashboard/subjects/${uuid.value}/permissions`),
      },
      {
        label: 'Занятия',
        icon: 'i-lucide-calendar',
        to: `/dashboard/subjects/${uuid.value}/lessons`,
        active: route.path.startsWith(`/dashboard/subjects/${uuid.value}/lessons`),
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
