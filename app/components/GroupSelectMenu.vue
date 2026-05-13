<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'
import { refDebounced, useInfiniteScroll } from '@vueuse/core'

type GroupResponse = components['schemas']['GroupResponse']
type GroupId = GroupResponse['id']

const modelValue = defineModel<GroupId>()

interface GroupOption { value: NonNullable<GroupId>, label: string }

// Internal full-object state so USelectMenu always has the label, even when
// the selected item is absent from the current search results.
const search = ref('')
const debouncedSearch = refDebounced(search, 1000)
const items = ref<GroupResponse[]>([])

const selectedOption = ref<GroupOption>()

watch(selectedOption, opt => (modelValue.value = opt?.value))
watch(() => modelValue.value, (id) => {
  if (!id) {
    selectedOption.value = undefined
    return
  }
  const found = items.value.find(g => g.id === id)
  if (found) {
    selectedOption.value = { value: found.id!, label: found.name ?? '—' }
  }
})

const { page, request, toPageState } = usePagable({
  filter: () => ({
    name: debouncedSearch.value || undefined,
  }),
})

const { data, pending, error } = useBackend('/api/groups', {
  method: 'GET',
  query: request,
})

const { totalPages } = toPageState(data)
const hasMore = computed(() => page.value < totalPages.value)

watch(
  () => data.value?.content,
  (newContent) => {
    if (!newContent)
      return
    if (page.value === 1)
      items.value = newContent
    else
      items.value.push(...newContent)
  },
  { immediate: true },
)

watch(debouncedSearch, () => {
  page.value = 1
  items.value = []
})

const groupOptions = computed(() =>
  items.value.map(g => ({
    value: g.id!,
    label: g.name ?? '—',
  })),
)

const { alertProps } = useApiError()

const selectMenuRef = ref()
useInfiniteScroll(
  () => selectMenuRef.value?.viewportRef,
  () => {
    if (!pending.value && hasMore.value)
      page.value++
  },
  { distance: 50 },
)
</script>

<template>
  <div class="space-y-2">
    <USelectMenu
      ref="selectMenuRef"
      v-model="selectedOption"
      v-model:search-term="search"
      :items="groupOptions"
      ignore-filter
      :loading="pending"
      placeholder="Поиск по названию"
      class="w-full"
    >
      <template #empty>
        <p class="py-2 text-center text-muted">
          {{ pending && items.length === 0 ? 'Загрузка...' : 'Ничего не найдено' }}
        </p>
      </template>

      <template #content-bottom>
        <p v-if="!hasMore && items.length > 0" class="py-2 text-center text-muted">
          Все группы загружены
        </p>
      </template>
    </USelectMenu>

    <UAlert v-if="error" v-bind="alertProps(error, 'Ошибка загрузки')" />
  </div>
</template>
