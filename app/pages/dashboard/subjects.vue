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

    if (route.path.includes('/settings')) {
      items.push({ label: 'Настройки', to: `/dashboard/subjects/${uuid.value}/settings` })
      if (route.path.includes('/permissions')) {
        items.push({ label: 'Назначения', to: `/dashboard/subjects/${uuid.value}/settings/permissions` })
        if (route.path.endsWith('/create')) {
          items.push({ label: 'Создание' })
        }
        else if (permId.value && route.path.endsWith('/edit')) {
          items.push({ label: 'Редактирование' })
        }
      }
    }
    else if (route.path.includes('/lessons')) {
      items.push({ label: 'Занятия', to: `/dashboard/subjects/${uuid.value}/lessons` })
      if (route.path.endsWith('/create'))
        items.push({ label: 'По количеству' })
      else if (route.path.endsWith('/schedule'))
        items.push({ label: 'По расписанию' })
      else if (route.path.endsWith('/grades'))
        items.push({ label: 'Задания' })
    }
    else if (route.path.includes('/check-ins')) {
      items.push({ label: 'Check-in', to: `/dashboard/subjects/${uuid.value}/check-ins` })
      if (route.path.endsWith('/create'))
        items.push({ label: 'Запуск' })
    }
    else if (route.path.includes('/attendances')) {
      items.push({ label: 'Посещаемость', to: `/dashboard/subjects/${uuid.value}/attendances` })
    }
    else if (route.path.includes('/grades')) {
      items.push({ label: 'Оценки', to: `/dashboard/subjects/${uuid.value}/grades` })
    }
    else if (route.path.includes('/final')) {
      items.push({ label: 'Итоговые оценки', to: `/dashboard/subjects/${uuid.value}/final` })
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
        label: 'Занятия',
        icon: 'i-lucide-calendar',
        to: `/dashboard/subjects/${uuid.value}/lessons`,
        active: route.path.startsWith(`/dashboard/subjects/${uuid.value}/lessons`),
      },
      {
        label: 'Check-in',
        icon: 'i-lucide-clipboard-list',
        to: `/dashboard/subjects/${uuid.value}/check-ins`,
        active: route.path.startsWith(`/dashboard/subjects/${uuid.value}/check-ins`),
      },
      {
        label: 'Посещаемость',
        icon: 'i-lucide-clipboard-check',
        to: `/dashboard/subjects/${uuid.value}/attendances`,
        active: route.path.startsWith(`/dashboard/subjects/${uuid.value}/attendances`),
      },
      {
        label: 'Оценки',
        icon: 'i-lucide-graduation-cap',
        to: `/dashboard/subjects/${uuid.value}/grades`,
        active: route.path.startsWith(`/dashboard/subjects/${uuid.value}/grades`),
      },
      {
        label: 'Итоговые оценки',
        icon: 'i-lucide-trophy',
        to: `/dashboard/subjects/${uuid.value}/final`,
        active: route.path.startsWith(`/dashboard/subjects/${uuid.value}/final`),
      },
      {
        label: 'Настройки',
        icon: 'i-lucide-settings',
        to: `/dashboard/subjects/${uuid.value}/settings`,
        active: route.path.startsWith(`/dashboard/subjects/${uuid.value}/settings`),
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
