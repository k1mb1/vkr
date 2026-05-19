<script setup lang="ts">
const { permission, scope, scopes, selectedScopeId } = usePermissions()

const allPermissions = computed(() => permission.value?.allPermissions ?? false)

const scopeItems = computed(() =>
  scopes.value
    .filter(s => !!s.id)
    .map((s) => {
      const parts: string[] = [s.group?.name ?? '—']
      if (s.allowedSubgroup?.index != null)
        parts.push(`Подгруппа ${s.allowedSubgroup.index}`)
      return { value: s.id!, label: parts.join(' · ') }
    }),
)
</script>

<template>
  <div class="space-y-2">
    <!-- Multiple scopes — show selector -->
    <template v-if="scopes.length > 1">
      <USelect
        v-model="selectedScopeId"
        :items="scopeItems"
        class="w-full"
      />
    </template>

    <!-- Single scope — show group name -->
    <template v-else-if="scopes.length === 1">
      <UInput
        :model-value="scope?.group?.name ?? ''"
        disabled
        class="w-full"
      />
    </template>

    <!-- No scopes but allPermissions=true -->
    <template v-else-if="allPermissions">
      <UInput
        model-value="Все группы"
        disabled
        class="w-full"
      />
    </template>

    <!-- No scopes, no allPermissions -->
    <template v-else>
      <UInput
        model-value="Нет доступов"
        disabled
        class="w-full"
      />
    </template>
  </div>
</template>
