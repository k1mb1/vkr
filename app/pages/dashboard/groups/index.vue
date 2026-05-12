<script setup lang="ts">
import { useGroupList } from '~/composables/useGroupList'

const {
  search,
  debouncedSearch,
  page,
  pageSize,

  applySearch,
  clearSearch,

  pending,
  error,
  refresh,

  rows,
  totalElements,
} = useGroupList()
</script>

<template>
  <div class="flex h-full flex-col gap-6">
    <UPageHeader title="Группы">
      <template #links>
        <UButton
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="ghost"
          :loading="pending"
          @click="refresh()"
        />
        <GroupsCreateModal />
      </template>
    </UPageHeader>

    <div class="flex gap-2">
      <UInput
        v-model="search"
        icon="i-lucide-search"
        placeholder="Поиск групп"
        class="w-full"
        :ui="{ root: 'sm:w-96' }"
        @keydown.enter="applySearch"
      >
        <template v-if="search" #trailing>
          <UButton
            color="neutral"
            variant="link"
            icon="i-lucide-x"
            @click="clearSearch"
          />
        </template>
      </UInput>
      <UButton
        icon="i-lucide-search"
        color="neutral"
        variant="outline"
        @click="applySearch"
      />
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
      :title="debouncedSearch ? 'Группы не найдены' : 'Группы не найдены'"
      :description="
        debouncedSearch
          ? 'Попробуйте изменить запрос поиска.'
          : 'Создайте первую группу с помощью кнопки выше.'
      "
      variant="naked"
    />

    <UPageGrid v-else>
      <UPageCard
        v-for="group in rows"
        :key="group.id"
        :to="`/dashboard/groups/${group.id}`"
        :title="group.name"
        icon="i-lucide-users"
        :ui="{
          wrapper: 'flex-row items-center gap-3',
          leading: 'mb-0',
          body: 'flex-1',
          footer: 'pt-0 mt-0',
          title: 'truncate',
        }"
      >
        <template #footer>
          <UIcon name="i-lucide-chevron-right" />
        </template>
      </UPageCard>
    </UPageGrid>

    <UPagination
      v-model:page="page"
      :items-per-page="pageSize"
      :total="totalElements"
      :disabled="pending"
      class="self-end"
    />
  </div>
</template>
