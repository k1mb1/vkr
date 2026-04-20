<script setup lang="ts">
import type { DashboardNavbarProps, DashboardPanelProps, DashboardToolbarProps } from '@nuxt/ui'

const props = defineProps<{
  panelId: string
  panelTitle?: string
  dashboardPanelUi?: DashboardPanelProps['ui']
  navbarUi?: DashboardNavbarProps['ui']
  toolbarUi?: DashboardToolbarProps['ui']
}>()

const open = ref(false)
const sidebarCollapsed = ref(false)
const slots = useSlots()

const { links } = useDashboardNavigation(open)
</script>

<template>
  <UDashboardGroup
    unit="rem"
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
        </template>
      </template>

      <template #footer="{ collapsed }">
        <LayoutUserMenu
          :collapsed="collapsed"
          block
        />
      </template>
    </UDashboardSidebar>

    <BaseDashboardPanel
      :id="props.panelId"
      :title="props.panelTitle"
      :dashboard-panel-ui="props.dashboardPanelUi"
      :navbar-ui="props.navbarUi"
      :toolbar-ui="props.toolbarUi"
    >
      <template v-if="slots['navbar-title']" #navbar-title>
        <slot name="navbar-title" />
      </template>
      <template v-if="slots['navbar-trailing']" #navbar-trailing>
        <slot name="navbar-trailing" />
      </template>
      <template v-if="slots['navbar-right']" #navbar-right>
        <slot name="navbar-right" />
      </template>
      <template v-if="slots['toolbar-left']" #toolbar-left>
        <slot name="toolbar-left" />
      </template>
      <template v-if="slots['toolbar-right']" #toolbar-right>
        <slot name="toolbar-right" />
      </template>
      <template v-if="slots.toolbar" #toolbar>
        <slot name="toolbar" />
      </template>
      <template #body>
        <slot />
      </template>
    </BaseDashboardPanel>
  </UDashboardGroup>
</template>
