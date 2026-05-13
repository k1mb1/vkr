<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'

type SubgroupResponse = components['schemas']['SubgroupResponse']
type SubgroupIndex = SubgroupResponse['index']

interface Props {
  groupId: string
}

const props = defineProps<Props>()

const modelValue = defineModel<SubgroupIndex>()

const { data, pending, error } = useBackend('/api/groups/{id}/subgroups', {
  method: 'GET',
  path: {
    id: computed(() => props.groupId),
  },
})

const subgroupOptions = computed(() => {
  const subgroups = data.value ?? []
  return [
    { value: undefined as SubgroupIndex, label: 'Все' },
    ...subgroups.map((s: SubgroupResponse) => ({
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
