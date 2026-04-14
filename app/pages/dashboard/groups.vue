<script setup lang="ts">
import CreateGroupToolbarForm from '~/components/groups/CreateGroupToolbarForm.vue'
import { provideGroupsBreadcrumbLabel, useGroupsBreadcrumbItems } from '~/composables/useGroupsBreadcrumbItems'

const groupsListRefreshHandler = useState<null | (() => void | Promise<void>)>('groups-list-refresh-handler', () => null)
const activeGroupName = provideGroupsBreadcrumbLabel()
const breadcrumbItems = useGroupsBreadcrumbItems(activeGroupName)

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
