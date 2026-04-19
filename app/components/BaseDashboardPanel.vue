<script setup lang="ts">
import type { DashboardNavbarProps, DashboardPanelProps, DashboardToolbarProps } from '@nuxt/ui'
import type { VNode } from 'vue'

const props = defineProps<{
  // UDashboardPanel
  id: string
  dashboardPanelUi?: DashboardPanelProps['ui']
  // UDashboardNavbar
  title?: DashboardNavbarProps['title']
  navbarUi?: DashboardNavbarProps['ui']
  // UDashboardToolbar
  toolbarUi?: DashboardToolbarProps['ui']
}>()

const slots = defineSlots<{
  'navbar-title'?: () => VNode[]
  'navbar-trailing'?: () => VNode[]
  'navbar-right'?: () => VNode[]
  'toolbar-left'?: () => VNode[]
  'toolbar-right'?: () => VNode[]
  'toolbar'?: () => VNode[]
  'body'?: () => VNode[]
}>()
</script>

<template>
  <UDashboardPanel :id="props.id" :resizable="true" :ui="props.dashboardPanelUi">
    <template #header>
      <UDashboardNavbar :title="props.title" :ui="props.navbarUi">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template v-if="slots['navbar-title']" #title>
          <slot name="navbar-title" />
        </template>

        <template v-if="slots['navbar-trailing']" #trailing>
          <slot name="navbar-trailing" />
        </template>

        <template v-if="slots['navbar-right']" #right>
          <slot name="navbar-right" />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar
        v-if="slots.toolbar || slots['toolbar-left'] || slots['toolbar-right']"
        :ui="props.toolbarUi"
      >
        <template v-if="slots['toolbar-left']" #left>
          <slot name="toolbar-left" />
        </template>
        <template v-if="slots['toolbar-right']" #right>
          <slot name="toolbar-right" />
        </template>
        <slot name="toolbar" />
      </UDashboardToolbar>
    </template>

    <template v-if="slots.body" #body>
      <slot name="body" />
    </template>
  </UDashboardPanel>
</template>
