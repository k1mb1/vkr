<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'

type SubgroupResponse = components['schemas']['SubgroupResponse']
type SubgroupIndex = SubgroupResponse['index']
type GroupId = components['schemas']['GroupResponse']['id']

const props = defineProps<{
  groupId: GroupId
}>()

const modelValue = defineModel<SubgroupResponse>()

const { data, pending, error } = useBackend('/api/subgroups', {
  method: 'GET',
  query: {
    groupId: computed(() => String(props.groupId ?? '')),
  },
})

const items = computed(() => data.value ?? [])

const indexToSubgroup = computed(() => new Map(items.value.map(s => [s.index, s])))

const selectedIndex = computed<SubgroupIndex>({
  get: () => modelValue.value?.index,
  set: (index) => {
    modelValue.value = index != null ? indexToSubgroup.value.get(index) : undefined
  },
})

const subgroupOptions = computed(() => [
  { value: null as unknown as SubgroupIndex, label: 'Все' },
  ...items.value.map(s => ({
    value: s.index,
    label: `Подгруппа ${s.index}`,
  })),
])

const { alertProps } = useApiError()
</script>

<template>
  <div class="space-y-2">
    <USelect
      v-model="selectedIndex"
      :items="subgroupOptions"
      :loading="pending"
      :trailing="!pending"
      :disabled="pending"
      icon="i-lucide-users"
      placeholder="Выберите подгруппу..."
      class="w-full"
    />

    <UAlert v-if="error" v-bind="alertProps(error, 'Ошибка загрузки')" />
  </div>
</template>
