<script setup lang="ts">
import type { StudentGroupPageResponse } from '#shared/types/backend'
import type { TableColumn, TableRow } from '@nuxt/ui'
import { h, resolveComponent } from 'vue'
import { PAGE_DEFAULTS } from '#shared/types/backend'
import { useStudentsGroupsApi } from '~/composables/api/useStudentsGroups'

const UButton = resolveComponent('UButton')
const UPagination = resolveComponent('UPagination')

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
  {
    accessorKey: 'name',
    header: 'Name',
    footer: () => h('p', { class: 'text-sm text-muted' }, `Total: ${total.value}`),
  },
  {
    accessorKey: 'subgroupCount',
    header: 'Subgroups',
    meta: {
      class: {
        th: 'text-right',
      },
    },
    footer: () =>
      h('div', { class: 'flex justify-end gap-2' }, [
        h(
          UButton,
          {
            icon: 'i-lucide-refresh-cw',
            loading: pending.value,
            onClick: onRefresh,
          },
          () => 'Refresh',
        ),
        h(UPagination, {
          page: page.value,
          'onUpdate:page': (value: number) => {
            page.value = value
          },
          itemsPerPage: pageSize,
          total: total.value,
          disabled: pending.value,
        }),
      ]),
  },
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

      <UTable
        :data="rows"
        :columns="columns"
        :loading="pending"
        sticky="footer"
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
  </div>
</template>
