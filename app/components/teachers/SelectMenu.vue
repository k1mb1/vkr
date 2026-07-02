<script setup lang="ts">
import type { TeacherResponse } from '#hey-api'
import { refDebounced } from '@vueuse/core'
import { getTeachersPage } from '#hey-api'

const props = defineProps<{
  excludeId?: NonNullable<TeacherResponse['id']>[]
  initialLabel?: string
}>()

const modelValue = defineModel<string>()

const search = ref('')
const debouncedSearch = refDebounced(search, 300)

const { page, request, toPageState } = usePagable({
  filter: () => ({ username: debouncedSearch.value || undefined }),
})

const { data, pending, error } = useApi({ key: 'teachers-select', watch: [request] }, () => getTeachersPage({ query: request.value }))
const { totalPages } = toPageState(data)

const { selectedOption, hasMore, selectOptions, menuRef } = useInfiniteSelectMenu<TeacherResponse>({
  modelValue: modelValue as Ref<string | undefined>,
  data,
  pending,
  totalPages,
  page,
  debouncedSearch,
  getId: t => t.id,
  getLabel: t => t.username ?? '—',
  initialLabel: () => props.initialLabel,
  exclude: () => props.excludeId,
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
      placeholder="Поиск по ФИО"
      class="w-full"
    >
      <template #empty>
        <p class="py-2 text-center text-muted">
          {{ pending && !selectOptions.length ? 'Загрузка...' : 'Ничего не найдено' }}
        </p>
      </template>
      <template #content-bottom>
        <p v-if="!hasMore && selectOptions.length" class="py-2 text-center text-muted">
          Все преподаватели загружены
        </p>
      </template>
    </USelectMenu>
    <UAlert v-if="error" v-bind="alertProps(error, 'Ошибка загрузки')" />
  </div>
</template>
