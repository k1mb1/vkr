<script setup lang="ts">
const modelValue = defineModel<string>()

const { scopes, pending, error } = usePermissions()

const options = computed(() =>
  (scopes.value ?? [])
    .filter(s => !!s.group?.id)
    .map(s => ({
      value: s.group!.id!,
      label: s.group?.name ?? '—',
    })),
)

const selectedOption = computed({
  get: () => options.value.find(o => o.value === modelValue.value),
  set: (val) => {
    modelValue.value = val?.value ?? ''
  },
})

watch(options, (opts) => {
  if (opts.length === 1 && !modelValue.value)
    modelValue.value = opts[0]!.value
}, { immediate: true })

const { alertProps } = useApiError()
</script>

<template>
  <div class="space-y-2">
    <USelectMenu
      v-model="selectedOption"
      :items="options"
      :loading="pending"
      placeholder="Выберите группу"
      class="w-full"
    />
    <UAlert v-if="error" v-bind="alertProps(error, 'Ошибка загрузки')" />
  </div>
</template>
