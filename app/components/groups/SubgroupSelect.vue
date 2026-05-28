<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'

type GroupWithSubgroupsResponse = components['schemas']['GroupWithSubgroupsResponse']

const props = defineProps<{
  modelValue?: { groupId?: string | null, subgroupId?: string | null }
  groups?: GroupWithSubgroupsResponse[]
  loading?: boolean
  restrictSubgroupId?: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: { groupId?: string | null, subgroupId?: string | null }]
}>()

const ALL_VALUE = '__all__'

const selectedGroupId = computed({
  get: () => props.modelValue?.groupId ?? ALL_VALUE,
  set: (val) => {
    const groupId = val === ALL_VALUE ? null : val
    emit('update:modelValue', { groupId, subgroupId: null })
  },
})

const selectedSubgroupId = computed({
  get: () => props.modelValue?.subgroupId ?? ALL_VALUE,
  set: (val) => {
    const subgroupId = val === ALL_VALUE ? null : val
    emit('update:modelValue', { groupId: props.modelValue?.groupId, subgroupId })
  },
})

const groupItems = computed(() => [
  { label: 'Все', value: ALL_VALUE },
  ...(props.groups ?? []).map(g => ({
    label: g.name ?? g.id ?? 'Unknown',
    value: g.id ?? '',
  })),
])

const selectedGroup = computed(() =>
  props.groups?.find(g => g.id === props.modelValue?.groupId),
)

const subgroupItems = computed(() => {
  const items = [
    { label: 'Все', value: ALL_VALUE },
    ...(selectedGroup.value?.subgroups ?? []).map(s => ({
      label: `Подгруппа ${s.index ?? s.id}`,
      value: s.id ?? '',
    })),
  ]
  if (props.restrictSubgroupId != null) {
    return items.filter(o => o.value === ALL_VALUE || o.value === props.restrictSubgroupId)
  }
  return items
})

watch(() => props.restrictSubgroupId, (id) => {
  if (id != null && props.modelValue?.subgroupId !== id) {
    emit('update:modelValue', {
      groupId: props.modelValue?.groupId,
      subgroupId: id,
    })
  }
}, { immediate: true })
</script>

<template>
  <div class="flex flex-col gap-3">
    <USelect
      v-model="selectedGroupId"
      :items="groupItems"
      :loading="loading"
      placeholder="Выберите группу"
      class="w-full"
    />
    <USelect
      v-model="selectedSubgroupId"
      :items="subgroupItems"
      :disabled="!props.modelValue?.groupId"
      placeholder="Выберите подгруппу"
      class="w-full"
    />
  </div>
</template>
