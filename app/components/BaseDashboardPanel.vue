<script setup lang="ts">
import type { BreadcrumbItem, DashboardPanelProps } from '@nuxt/ui'

interface Props {
  id: string
  title?: string
  items?: BreadcrumbItem[]
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
          v-if="props.title || props.items?.length"
          :title="props.title"
          :ui="{ right: 'gap-3' }"
        >
          <template #title>
            <slot name="title">
              <UBreadcrumb
                v-if="props.items?.length"
                :items="props.items"
              />
              <span v-else>{{ props.title }}</span>
            </slot>
          </template>

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
