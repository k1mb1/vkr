<script setup lang="ts">
import CreateGroupToolbarForm from '~/components/groups/CreateGroupToolbarForm.vue'

const route = useRoute()
const groupsListRefreshHandler = useState<null | (() => void | Promise<void>)>('groups-list-refresh-handler', () => null)
const activeGroupName = useState<string | null>('groups-active-name', () => null)

const breadcrumbItems = computed(() => {
  const items = [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Groups', to: '/dashboard/groups' }
  ]

  const uuid = route.params.uuid

  if (typeof uuid === 'string' && uuid.length > 0) {
    items.push({
      label: activeGroupName.value || uuid,
      to: `/dashboard/groups/${uuid}`
    })
  }

  return items
})

function refreshGroupsList() {
  void groupsListRefreshHandler.value?.()
}
</script>

<template>
  <NuxtLayout name="dashboard">
    <UDashboardPanel
      id="dashboard-groups"
      :ui="{ body: 'h-full p-0 sm:p-0' }"
    >
      <template #header>
        <UDashboardNavbar :ui="{ right: 'gap-3' }">
          <template #title>
            <UBreadcrumb :items="breadcrumbItems" />
          </template>

          <template #leading>
            <UDashboardSidebarCollapse />
          </template>

          <template #right>
            <CreateGroupToolbarForm :after-create="refreshGroupsList" />
            <UColorModeButton />
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <NuxtPage />
      </template>
    </UDashboardPanel>
  </NuxtLayout>
</template>
