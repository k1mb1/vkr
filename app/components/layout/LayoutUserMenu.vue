<script setup lang="ts">
defineProps<{
  collapsed?: boolean
  block?: boolean
}>()

const { user, logout } = useOidcAuth()
</script>

<template>
  <UButton
    :label="collapsed ? undefined : (user?.name || user?.email || 'User')"
    icon="i-lucide-log-out"
    color="neutral"
    variant="ghost"
    :block="block"
    :square="collapsed"
    class="w-full"
    @click="logout"
  />
</template>
