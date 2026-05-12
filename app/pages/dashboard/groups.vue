<script setup lang="ts">
import type { BreadcrumbItem } from '@nuxt/ui'

const route = useRoute()

const activeGroupName = useState<string | null>(
  'groups-active-name',
  () => null,
)

const uuid = computed(() => {
  const param = route.params.uuid
  return typeof param === 'string' ? param : null
})

const breadcrumbItems = computed<BreadcrumbItem[]>(() => {
  const base: BreadcrumbItem[] = [
    { label: 'Главная', to: '/dashboard' },
    { label: 'Группы', to: '/dashboard/groups' },
  ]

  if (!uuid.value)
    return base

  return [
    ...base,
    {
      label: activeGroupName.value ?? 'Группа',
      to: `/dashboard/groups/${uuid.value}`,
    },
  ]
})
</script>

<template>
  <NuxtLayout
    name="dashboard"
    panel-id="dashboard-groups"
    :navbar-ui="{ right: 'gap-3' }"
  >
    <template #navbar-title>
      <UBreadcrumb :items="breadcrumbItems" />
    </template>
    <NuxtPage />
  </NuxtLayout>
</template>
