<script setup lang="ts">
import type { GroupResponse } from '#hey-api'
import { getSubgroups } from '#hey-api'

type GroupId = GroupResponse['id']

const props = defineProps<{
  groupId: GroupId
  allowedSubgroupId?: string | null
}>()

const modelValue = defineModel<string | null | undefined>()

const { data, pending, error, refresh } = useApi(
  { key: 'subgroups-select', immediate: false },
  () => getSubgroups({ query: { groupId: String(props.groupId ?? '') } }),
)

watch(() => props.groupId, (id) => {
  if (id)
    refresh()
}, { immediate: true })

const subgroupOptions = computed(() => {
  const all = [
    { value: null as string | null, label: 'Все' },
    ...(data.value ?? []).map(s => ({ value: s.id!, label: `Подгруппа ${s.index}` })),
  ]
  if (props.allowedSubgroupId != null) {
    return all.filter(o => o.value === props.allowedSubgroupId)
  }
  return all
})

watch(() => props.allowedSubgroupId, (id) => {
  if (id != null)
    modelValue.value = id
}, { immediate: true })

watch(subgroupOptions, (opts) => {
  const subgroups = opts.filter(o => o.value !== null)
  if (subgroups.length === 1 && modelValue.value !== subgroups[0]!.value)
    modelValue.value = subgroups[0]!.value
}, { immediate: true })

const { alertProps } = useApiError()
</script>

<template>
  <div class="space-y-2">
    <USelect
      v-model="modelValue"
      :items="subgroupOptions"
      :loading="pending"
      :disabled="pending || !groupId"
      icon="i-lucide-layers"
      placeholder="Выберите подгруппу..."
      class="w-full"
    />
    <UAlert v-if="error" v-bind="alertProps(error, 'Ошибка загрузки')" />
  </div>
</template>
