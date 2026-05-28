<script setup lang="ts">
const { permission } = usePermissions()

const hasAccess = computed(() => permission.value?.allPermissions === true)
</script>

<template>
  <slot v-if="hasAccess" />
  <slot v-else name="denied" />
</template>
