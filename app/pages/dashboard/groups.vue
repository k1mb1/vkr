<script setup lang="ts">
import CreateGroupToolbarForm from '~/components/groups/CreateGroupToolbarForm.vue'

definePageMeta({
  layout: 'dashboard'
})

const route = useRoute()
const groupsListRefreshKey = useState<number>('groups-list-refresh-key', () => 0)
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
  groupsListRefreshKey.value += 1
}
</script>

<template>
  <BaseDashboardPanel
    id="dashboard-groups"
    :panel-props="{ ui: { body: 'h-full p-0 sm:p-0' } }"
    :items="breadcrumbItems"
  >
    <template #actions>
      <CreateGroupToolbarForm :after-create="refreshGroupsList" />
    </template>

    <template #body>
      <NuxtPage />
    </template>
  </BaseDashboardPanel>
</template>
