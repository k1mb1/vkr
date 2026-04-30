<script setup lang="ts">
const route = useRoute()

const activeGroupName = useState<string | null>('groups-active-name', () => null)
const refreshHandler = useState<null | (() => void | Promise<void>)>(
  'groups-list-refresh-handler',
  () => null,
)

const _refreshGroupsList = () => refreshHandler.value?.()

const breadcrumbItems = computed(() => {
  const items = [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Groups', to: '/dashboard/groups' },
  ]

  const uuid = route.params.uuid

  if (typeof uuid === 'string' && uuid) {
    items.push({
      label: activeGroupName.value || 'Group',
      to: `/dashboard/groups/${uuid}`,
    })
  }

  return items
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
