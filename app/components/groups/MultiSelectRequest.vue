<script setup lang="ts">
import type { GroupResponse } from '#hey-api'
import { getGroupsPage } from '#hey-api'

const modelValue = defineModel<string[]>({ default: () => [] })

const { data, pending, error } = useApi(
  { key: 'groups-multiselect' },
  () => getGroupsPage({ query: { size: 1000 } }),
)

const options = computed(() =>
  (data.value?.content ?? []).map((g: GroupResponse) => ({ value: g.id!, label: g.name ?? '—' })),
)

const selectedOptions = computed({
  get: () => options.value.filter(o => modelValue.value.includes(o.value)),
  set: (val) => {
    modelValue.value = val.map(o => o.value)
  },
})

const groupNameById = computed(() => {
  const map = new Map<string, string>()
  for (const g of data.value?.content ?? []) {
    if (g.id)
      map.set(g.id, g.name ?? '—')
  }
  return map
})

defineExpose({ groupNameById })

const { alertProps } = useApiError()
</script>

<template>
  <div class="space-y-2">
    <USelectMenu
      v-model="selectedOptions"
      :items="options"
      multiple
      :loading="pending"
      placeholder="Выберите группы..."
      class="w-full"
    />
    <UAlert v-if="error" v-bind="alertProps(error, 'Ошибка загрузки')" />

    <div
      v-else-if="!pending && options.length === 0"
      class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-default p-3"
    >
      <span class="text-sm text-muted">Пока нет ни одной группы.</span>
      <UButton
        to="/dashboard/groups/create"
        icon="i-lucide-plus"
        label="Создать группу"
        color="primary"
        variant="subtle"
        size="sm"
      />
    </div>
  </div>
</template>
