<script setup lang="ts">
import { useStudentGroups } from '~/composables/api/useStudentsGroups'
import { usePagable } from '~/composables/usePagable'

const { page, pageSize, request, toPageState } = usePagable()

const { data, pending, error, refresh } = useStudentGroups(request)

const { rows, total, totalPages } = toPageState(data)

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
      <GroupsGroupCard
        v-for="group in rows"
        :key="group.id"
        :group="group"
      />
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
