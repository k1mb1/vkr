<script setup lang="ts">
const { hasAllPermissions, scopes } = usePermissions()

const selectedScopeId = ref<string | undefined>()

watch(scopes, (val) => {
  if (val.length === 1 && val[0]?.id)
    selectedScopeId.value = val[0].id
}, { immediate: true })

const scopeItems = computed(() =>
  scopes.value.filter(s => s.id).map(s => ({
    value: s.id!,
    label: [
      s.group?.name ?? '—',
      s.allowedSubgroup?.index != null ? `Подгруппа ${s.allowedSubgroup.index}` : null,
    ].filter(Boolean).join(' · '),
  })),
)

const singleLabel = computed(() => {
  if (scopes.value.length === 1)
    return scopes.value[0]?.group?.name ?? '—'
  return hasAllPermissions.value ? 'Все группы' : 'Нет доступов'
})
</script>

<template>
  <div class="space-y-2">
    <USelect
      v-if="scopes.length > 1"
      v-model="selectedScopeId"
      :items="scopeItems"
      class="w-full"
    />
    <UInput v-else :model-value="singleLabel" disabled class="w-full" />
  </div>
</template>
