<script setup lang="ts">
import type { BreadcrumbItem } from '@nuxt/ui'

const route = useRoute()

const activeSubjectName = useState<string | null>(
  'subjects-active-name',
  () => null,
)

const uuid = computed(() => {
  const param = route.params.uuid
  return typeof param === 'string' ? param : null
})

const breadcrumbItems = computed<BreadcrumbItem[]>(() => {
  const base: BreadcrumbItem[] = [
    { label: 'Главная', to: '/dashboard' },
    { label: 'Предметы', to: '/dashboard/subjects' },
  ]

  if (!uuid.value)
    return base

  return [
    ...base,
    {
      label: activeSubjectName.value ?? 'Предмет',
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
