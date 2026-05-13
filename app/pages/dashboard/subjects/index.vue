<script setup lang="ts">
import type { User } from '#auth-utils'
import { usePagable } from '~/composables/usePagable'

const { user } = useOidcAuth()

const search = ref('')
const debouncedSearch = ref('')

const { sub: teacherId } = user.value as User

const { page, pageSize, request, toPageState } = usePagable({
  filter: () => ({
    name: debouncedSearch.value || undefined,
    teacherId: teacherId!,
  }),
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

const { data, pending, error, refresh } = useBackend('/api/subjects', {
  method: 'GET',
  query: request,
})

const { rows, totalElements } = toPageState(data)
</script>

<template>
  <div class="flex h-full flex-col gap-6">
    <UPageHeader title="Предметы">
      <template #links>
        <UButton
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="ghost"
          :loading="pending"
          @click="refresh()"
        />
      </template>
    </UPageHeader>

    <div class="flex gap-2">
      <UInput
        v-model="search"
        icon="i-lucide-search"
        placeholder="Поиск предметов"
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
      icon="i-lucide-book-open"
      :title="debouncedSearch ? 'Предметы не найдены' : 'Предметы не найдены'"
      :description="
        debouncedSearch
          ? 'Попробуйте изменить запрос поиска.'
          : 'Создайте первый предмет с помощью кнопки выше.'
      "
      variant="naked"
    />

    <UPageGrid v-else>
      <UPageCard
        v-for="subject in rows"
        :key="subject.id"
        :to="`/dashboard/subjects/${subject.id}`"
        :title="subject.name"
        :description="subject.description"
        icon="i-lucide-book-open"
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
