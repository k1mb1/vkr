<script setup lang="ts">
import type { StudentGroupPageResponse } from '#shared/types/backend'
import type { TableColumn, TableRow } from '@nuxt/ui'
import { PAGE_DEFAULTS } from '#shared/types/backend'
import { useStudentsGroupsApi } from '~/composables/api/useStudentsGroups'

const page = ref(PAGE_DEFAULTS.number + 1)
const pageSize = PAGE_DEFAULTS.size

const { findAll } = useStudentsGroupsApi()

const { data, pending, error, refresh } = findAll(computed(() => ({
  page: page.value - 1,
  size: pageSize,
})))

const rows = computed(() => data.value?.content ?? [])
const total = computed(() => data.value?.page.totalElements ?? 0)

const columns: TableColumn<StudentGroupPageResponse>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'subgroupCount', header: 'Subgroups' },
]

function onSelect(_: Event, row: TableRow<StudentGroupPageResponse>) {
  return navigateTo(`/dashboard/groups/${row.original.id}`)
}

const onRefresh = () => refresh()
</script>

<template>
  <div class="flex h-full flex-col gap-4 p-4 sm:p-6">
    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      title="Failed to load groups"
      :description="error.message"
    />

    <UPageCard class="flex-1 overflow-hidden">
      <UTable
        :data="rows"
        :columns="columns"
        :loading="pending"
        @select="onSelect"
      >
        <template #empty>
          <UEmpty
            icon="i-lucide-users"
            title="No groups found"
            description="Try refreshing or create your first group."
            variant="naked"
            class="py-8"
          >
            <template #actions>
              <UButton
                color="neutral"
                variant="outline"
                icon="i-lucide-refresh-cw"
                :loading="pending"
                @click="onRefresh"
              >
                Refresh
              </UButton>
            </template>
          </UEmpty>
        </template>
      </UTable>
    </UPageCard>

    <div class="flex items-center justify-between">
      <p class="text-sm text-muted">
        Total: {{ total }}
      </p>

      <div class="flex gap-2">
        <UButton
          icon="i-lucide-refresh-cw"
          :loading="pending"
          @click="onRefresh"
        >
          Refresh
        </UButton>

        <UPagination
          v-model:page="page"
          :items-per-page="pageSize"
          :total="total"
          :disabled="pending"
        />
      </div>
    </div>
  </div>
</template>
