<script setup lang="ts">
import { PAGE_DEFAULTS } from '#shared/types/backend'
import { useStudentsGroupsApi } from '~/composables/api/useStudentsGroups'

const page = ref(PAGE_DEFAULTS.page + 1)
const pageSize = PAGE_DEFAULTS.size

const { findAll } = useStudentsGroupsApi()

const { data, pending, error, refresh } = findAll(computed(() => ({
  page: page.value - 1,
  size: pageSize,
})))

const rows = computed(() => data.value?.content ?? [])
const total = computed(() => data.value?.totalElements ?? 0)
const totalPages = computed(() => data.value?.totalPages ?? 0)

function onRefresh() {
  return refresh()
}
</script>

<template>
  <div class="flex h-full flex-col gap-6 p-4 sm:p-6">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold">
        Группы
      </h1>
      <div class="flex items-center gap-2">
        <GroupsCreateToolbarForm :after-create="onRefresh" />
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-refresh-cw"
          :loading="pending"
          @click="onRefresh"
        />
      </div>
    </div>

    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      title="Ошибка загрузки"
      :description="error.message"
    />

    <div v-if="pending && rows.length === 0" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <USkeleton v-for="i in 6" :key="i" class="h-28" />
    </div>

    <UEmpty
      v-else-if="rows.length === 0"
      icon="i-lucide-users"
      title="Группы не найдены"
      description="Создайте первую группу с помощью кнопки выше."
      variant="naked"
      class="py-8"
    />

    <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <UCard
        v-for="group in rows"
        :key="group.id"
        class="group cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5"
        :ui="{ body: 'p-0' }"
        @click="navigateTo(`/dashboard/groups/${group.id}`)"
      >
        <div class="flex flex-col gap-3 p-5">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
              <UIcon name="i-lucide-users" class="size-5" />
            </div>
            <div class="min-w-0">
              <h3 class="truncate font-semibold">
                {{ group.name }}
              </h3>
              <p class="text-xs text-muted">
                {{ group.subgroupCount }} подгрупп{{ group.subgroupCount === 1 ? 'а' : group.subgroupCount > 1 && group.subgroupCount < 5 ? 'ы' : '' }}
              </p>
            </div>
          </div>

          <div class="flex items-center justify-between pt-1">
            <span class="text-xs text-muted">
              ID: {{ group.id.slice(0, 8) }}…
            </span>
            <UButton
              color="neutral"
              variant="ghost"
              size="xs"
              icon="i-lucide-chevron-right"
              class="opacity-0 transition-opacity group-hover:opacity-100"
            />
          </div>
        </div>
      </UCard>
    </div>

    <div v-if="totalPages > 1" class="flex justify-center">
      <UPagination
        v-model:page="page"
        :items-per-page="pageSize"
        :total="total"
        :disabled="pending"
      />
    </div>
  </div>
</template>
