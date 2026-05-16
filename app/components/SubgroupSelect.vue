<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'

type GroupId = components['schemas']['GroupResponse']['id']

const props = defineProps<{ groupId: GroupId }>()

const modelValue = defineModel<string | null | undefined>()

const { data, pending, error } = useBackend('/api/subgroups', {
  method: 'GET',
  query: { groupId: computed(() => String(props.groupId ?? '')) },
})

const subgroupOptions = computed(() => [
  { value: null as string | null, label: 'Все' },
  ...(data.value ?? []).map(s => ({ value: s.id!, label: `Подгруппа ${s.index}` })),
])

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
