<script setup lang="ts">
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
    <BaseDashboardPanel
      id="dashboard-groups"
      :dashboard-panel-ui="{ body: 'h-full p-0 sm:p-0' }"
      :navbar-ui="{ right: 'gap-3' }"
    >
      <template #navbar-title>
        <UBreadcrumb :items="breadcrumbItems" />
      </template>

      <template #navbar-right>
        <CreateGroupToolbarForm :after-create="refreshGroupsList" />
        <UColorModeButton />
      </template>

      <template #body>
        <NuxtPage />
      </template>
    </BaseDashboardPanel>
  </NuxtLayout>
</template>
