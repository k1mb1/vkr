<script setup lang="ts">
import type { GroupResponse } from '#hey-api'
import { refDebounced } from '@vueuse/core'
import { getGroupPage } from '#hey-api'

const props = defineProps<{
  initialLabel?: string
}>()
const modelValue = defineModel<string>()
const search = ref('')
const debouncedSearch = refDebounced(search, 300)
const { page, request, toPageState } = usePagable({
  filter: () => ({ name: debouncedSearch.value || undefined }),
})
const { data, pending, error } = useApi({ key: 'groups-single-select', watch: [request] }, () => getGroupPage({ query: request.value }))
const { totalPages } = toPageState(data)
const { selectedOption, hasMore, selectOptions, menuRef } = useInfiniteSelectMenu<GroupResponse>({
  modelValue: modelValue as Ref<string | undefined>,
  data,
  pending,
  totalPages,
  page,
  debouncedSearch,
  getId: g => g.id,
  getLabel: g => g.name ?? '—',
  initialLabel: () => props.initialLabel,
})
const { alertProps } = useApiError()
</script>

<template>
  <div class="space-y-2">
    <USelectMenu
      ref="menuRef"
      v-model="selectedOption"
      v-model:search-term="search"
      :items="selectOptions"
      ignore-filter
      :loading="pending"
      placeholder="Поиск по названию"
      class="w-full"
    >
      <template #empty>
        <p class="py-2 text-center text-muted">
          {{ pending && !selectOptions.length ? 'Загрузка...' : 'Ничего не найдено' }}
        </p>
      </template>
      <template #content-bottom>
        <p v-if="!hasMore && selectOptions.length" class="py-2 text-center text-muted">
          Все группы загружены
        </p>
      </template>
    </USelectMenu>
    <UAlert v-if="error" v-bind="alertProps(error, 'Ошибка загрузки')" />
  </div>
</template>
