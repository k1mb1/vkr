<script setup lang="ts">
import { useStudentGroups } from '~/composables/api/useStudentsGroups'
import { usePagable } from '~/composables/usePagable'

const search = ref('')
const debouncedSearch = ref('')

const { page, pageSize, request, toPageState } = usePagable({
  filter: computed(() => ({
    name: debouncedSearch.value || undefined,
  })),
})

function applySearch() {
  debouncedSearch.value = search.value
  page.value = 1
}

function clearSearch() {
  search.value = ''
  debouncedSearch.value = ''
  page.value = 1
}

const { data, pending, error, refresh } = useStudentGroups(request)

const { rows, totalElements } = toPageState(data)
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
        <GroupsCreateToolbarForm />
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
      :description="debouncedSearch ? 'Попробуйте изменить запрос поиска.' : 'Создайте первую группу с помощью кнопки выше.'"
      variant="naked"
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

        <template #default>
          <div class="flex flex-wrap items-center gap-2">
            <UBadge
              color="neutral"
              variant="soft"
              :label="`${group.totalStudentCount} students`"
            />
            <UBadge
              color="primary"
              variant="soft"
              :label="`${group.subgroupCount} subgroups`"
            />
          </div>
        </template>

        <template #footer>
          <UButton
            color="neutral"
            variant="soft"
            label="Open"
            trailing-icon="i-lucide-chevron-right"
            :to="`/dashboard/groups/${group.id}`"
          />
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
