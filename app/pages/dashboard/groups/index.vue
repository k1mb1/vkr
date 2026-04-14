<script setup lang="ts">
import type { TableColumn, TableRow } from '@nuxt/ui'
import { PAGE_DEFAULTS, type StudentGroupPageResponse } from '#shared/types/backend'
import { useStudentsGroupsApi } from '~/composables/api/useStudentsGroups'

const page = ref(PAGE_DEFAULTS.number + 1)
const pageSize = PAGE_DEFAULTS.size

const { findAll } = useStudentsGroupsApi()

const request = computed(() => ({
  page: page.value - 1,
  size: pageSize
}))

const {
  data,
  pending,
  error,
  refresh
} = findAll(request)

const groupsListRefreshHandler = useState<null | (() => void | Promise<void>)>('groups-list-refresh-handler', () => null)

onMounted(() => {
  groupsListRefreshHandler.value = async () => {
    await refresh()
  }
})

onBeforeUnmount(() => {
  groupsListRefreshHandler.value = null
})

const rows = computed(() => data.value?.content ?? [])
const totalItems = computed(() => data.value?.page.totalElements ?? 0)

const columns: TableColumn<StudentGroupPageResponse>[] = [
  {
    accessorKey: 'name',
    header: 'Name'
  },
  {
    accessorKey: 'subgroupCount',
    header: 'Subgroups'
  }
]

function onSelect(_event: Event, row: TableRow<StudentGroupPageResponse>) {
  navigateTo(`/dashboard/groups/${row.original.id}`)
}

function onRefreshClick() {
  void refresh()
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-4 p-4 sm:p-6">
    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      title="Failed to load groups"
      :description="error.message"
    />

    <UPageCard class="flex-1 min-h-0 overflow-hidden">
      <UTable
        :data="rows"
        :columns="columns"
        :loading="pending"
        class="h-full"
        @select="onSelect"
      >
        <template #empty>
          <div class="py-8 text-center text-sm text-muted">
            No groups found.
          </div>
        </template>
      </UTable>
    </UPageCard>

    <div class="flex items-center justify-between gap-3">
      <p class="text-sm text-muted">
        Total: {{ totalItems }}
      </p>

      <div class="flex items-center gap-2">
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-refresh-cw"
          :loading="pending"
          @click="onRefreshClick"
        >
          Refresh
        </UButton>

        <UPagination
          v-model:page="page"
          :items-per-page="pageSize"
          :total="totalItems"
          :disabled="pending"
        />
      </div>
    </div>
  </div>
</template>
