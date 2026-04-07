<script setup lang="ts">
type GroupGateMode = 'any' | 'all'

const props = withDefaults(defineProps<{
  requiredGroups?: string[]
  mode?: GroupGateMode
}>(), {
  requiredGroups: () => [],
  mode: 'any'
})

const { hasGroups } = useGroupAccess()

const hasAccess = computed(() => {
  return hasGroups(props.requiredGroups, props.mode)
})
</script>

<template>
  <slot v-if="hasAccess" />
  <slot
    v-else
    name="denied"
  />
</template>
