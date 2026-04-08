<script setup lang="ts">
import type { DashboardPanelProps } from '@nuxt/ui'

interface Props {
  id: string
  title?: string
  panelProps?: Partial<DashboardPanelProps>
}

const props = defineProps<Props>()
const slots = useSlots()
</script>

<template>
  <UDashboardPanel
    :id="props.id"
    v-bind="props.panelProps ?? {}"
  >
    <template #header>
      <slot name="header">
        <UDashboardNavbar
          v-if="props.title"
          :title="props.title"
          :ui="{ right: 'gap-3' }"
        >
          <template #leading>
            <UDashboardSidebarCollapse />
          </template>

          <template #right>
            <slot name="actions" />
            <UColorModeButton />
          </template>
        </UDashboardNavbar>

        <UDashboardToolbar v-if="slots.toolbar || slots.filters">
          <template #left>
            <slot name="toolbar" />
          </template>

          <template #right>
            <slot name="filters" />
          </template>
        </UDashboardToolbar>
      </slot>
    </template>

    <template #body>
      <slot name="body">
        <UEmpty
          title="Пусто"
          description="Здесь пока ничего нет."
          class="h-full"
          variant="naked"
        />
      </slot>
    </template>
  </UDashboardPanel>
</template>
