<script setup lang="ts">
import { PAGE_DEFAULTS } from '#shared/types/backend'
import { useStudentGroups } from '~/composables/api/useStudentsGroups'

const page = ref(PAGE_DEFAULTS.page + 1)
const pageSize = PAGE_DEFAULTS.size

const { data, pending, error, refresh } = useStudentGroups(computed(() => ({
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
  <div class="flex h-full flex-col gap-6">
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

    <UPageGrid v-if="pending && rows.length === 0">
      <USkeleton v-for="i in 6" :key="i" class="h-28" />
    </UPageGrid>

    <UEmpty
      v-else-if="rows.length === 0"
      icon="i-lucide-users"
      title="Группы не найдены"
      description="Создайте первую группу с помощью кнопки выше."
      variant="naked"
      class="py-8"
    />

    <UPageGrid v-else>
      <UPageCard
        v-for="group in rows"
        :key="group.id"
        :to="`/dashboard/groups/${group.id}`"
        :title="group.name"
        :ui="{ title: 'truncate' }"
      >
        <template #leading>
          <UAvatar
            icon="i-lucide-users"
            class="rounded-lg bg-secondary/10 text-secondary"
          />
        </template>
        <template #description>
          {{ group.subgroupCount }} подгрупп{{ group.subgroupCount === 1 ? 'а' : group.subgroupCount > 1 && group.subgroupCount < 5 ? 'ы' : '' }}
        </template>
        <template #footer>
          <div class="flex justify-end">
            <UButton
              color="neutral"
              variant="link"
              label="Открыть"
              trailing-icon="i-lucide-chevron-right"
            />
          </div>
        </template>
      </UPageCard>
    </UPageGrid>

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
