<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { StudentGroupPageResponse } from '#shared/types/backend'
import { useStudentsGroupsApi } from '~/composables/api/useStudentsGroups'

definePageMeta({
  layout: 'dashboard'
})

const page = ref(1)
const pageSize = 10

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
</script>

<template>
  <BaseDashboardPanel
    id="dashboard-groups"
    :panel-props="{ ui: { body: 'h-full p-0 sm:p-0' } }"
    :items="[
      { label: 'Dashboard', to: '/dashboard' },
      { label: 'Groups', to: '/dashboard/groups' }
    ]"
  >
    <template #body>
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
              @click="() => refresh()"
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
  </BaseDashboardPanel>
</template>
