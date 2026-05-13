<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'

type SubgroupResponse = components['schemas']['SubgroupResponse']
type SubgroupIndex = SubgroupResponse['index']
type GroupId = components['schemas']['GroupResponse']['id']

const props = defineProps<{
  groupId: GroupId
}>()

const modelValue = defineModel<SubgroupIndex>()

const { data, pending, error } = useBackend('/api/groups/{id}/subgroups', {
  method: 'GET',
  path: { id: computed(() => String(props.groupId ?? '')) },
})

const items = computed(() => data.value ?? [])

const subgroupOptions = computed(() => {
  return [
    { value: undefined as SubgroupIndex, label: 'Все' },
    ...items.value.map(s => ({
      value: s.index,
      label: `Подгруппа ${s.index}`,
    })),
  ]
})

const { alertProps } = useApiError()
</script>

<template>
  <div class="space-y-2">
    <USelect
      v-model="modelValue"
      :items="subgroupOptions"
      :loading="pending"
      placeholder="Выберите подгруппу..."
      class="w-full"
    />

    <UAlert v-if="error" v-bind="alertProps(error, 'Ошибка загрузки')" />
  </div>
</template>
