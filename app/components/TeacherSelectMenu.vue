<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'
import { refDebounced, useInfiniteScroll } from '@vueuse/core'

type TeacherResponse = components['schemas']['TeacherResponse']
type TeacherId = TeacherResponse['id']

const modelValue = defineModel<TeacherId>()

interface TeacherOption { value: NonNullable<TeacherId>, label: string }

// Internal full-object state so USelectMenu always has the label, even when
// the selected item is absent from the current search results.
const selectedOption = ref<TeacherOption>()

watch(selectedOption, opt => (modelValue.value = opt?.value))

const search = ref('')
const debouncedSearch = refDebounced(search, 1000)
const items = ref<TeacherResponse[]>([])

const { page, request, toPageState } = usePagable({
  filter: () => ({
    username: debouncedSearch.value || undefined,
  }),
})

const { data, pending, error } = useBackend('/api/teachers', {
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

const teacherOptions = computed(() =>
  items.value.map(t => ({
    value: t.id!,
    label: t.username ?? '—',
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
      :items="teacherOptions"
      ignore-filter
      :loading="pending"
      placeholder="Поиск по username..."
      class="w-full"
    >
      <template #empty>
        <p class="py-2 text-center text-sm text-muted">
          {{ pending && items.length === 0 ? 'Загрузка...' : 'Ничего не найдено' }}
        </p>
      </template>

      <template #content-bottom>
        <p v-if="!hasMore && items.length > 0" class="py-2 text-center text-xs text-muted">
          Все учителя загружены
        </p>
      </template>
    </USelectMenu>

    <UAlert v-if="error" v-bind="alertProps(error, 'Ошибка загрузки')" />
  </div>
</template>
