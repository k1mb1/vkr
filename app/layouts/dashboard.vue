<script setup lang="ts">
const open = ref(false)
const sidebarCollapsed = ref(false)

const { links } = useDashboardNavigation()
</script>

<template>
  <div class="min-h-svh">
    <UDashboardGroup
      unit="rem"
      :ui="{ base: 'relative flex min-h-svh overflow-hidden' }"
    >
      <UDashboardSidebar
        id="dashboard"
        v-model:open="open"
        v-model:collapsed="sidebarCollapsed"
        collapsible
        resizable
        class="bg-elevated/25"
        :ui="{ footer: 'lg:border-t lg:border-default' }"
      >
        <template
          v-if="!sidebarCollapsed"
          #header
        >
          <LayoutSubjectMenu />
        </template>

        <template #default="{ collapsed }">
          <template
            v-for="(group, i) in links"
            :key="i"
          >
            <UNavigationMenu
              :collapsed="collapsed"
              :items="group"
              orientation="vertical"
              tooltip
              popover
              :class="{ 'mt-auto': i === links.length - 1 }"
            />

            <USeparator v-if="i < links.length - 2" />
          </template>
        </template>

        <template #footer="{ collapsed }">
          <LayoutUserMenu
            :collapsed="collapsed"
            block
          />
        </template>
      </UDashboardSidebar>

      <slot />
    </UDashboardGroup>
  </div>
</template>
