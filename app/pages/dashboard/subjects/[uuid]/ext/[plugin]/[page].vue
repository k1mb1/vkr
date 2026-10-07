<script setup lang="ts">
import type { Component } from 'vue'
import { toolbarButton } from '~/utils/toolbarButtons'

// Раздел предмета, добавленный плагином маркетплейса: декларативная таблица
// (рисует ядро) или компонент из кода плагина.
const route = useRoute()
const subjectId = computed(() => String(route.params.uuid ?? ''))

const { enabledPlugins, subjectPages, pending: pluginsPending } = usePlugins()

const page = computed(() =>
  subjectPages.value.find(p => p.pluginId === route.params.plugin && p.id === route.params.page) ?? null,
)
const plugin = computed(() => enabledPlugins.value.find(p => p.id === page.value?.pluginId) ?? null)

const { rows, pending, error, refresh } = usePluginDataset(subjectId)
useRefreshOnFocus(() => refresh())

// Код плагина грузим лениво — только когда открыт его раздел.
const nuxtApp = useNuxtApp()
const component = shallowRef<Component | null>(null)
const codeError = ref<string | null>(null)
watch(page, async (p) => {
  component.value = null
  codeError.value = null
  if (p?.view.type !== 'component' || !plugin.value)
    return
  try {
    await loadPluginCode(plugin.value, nuxtApp)
    component.value = getPluginComponent(p.pluginId, p.view.component)
    if (!component.value)
      codeError.value = `Плагин не зарегистрировал компонент «${p.view.component}»`
  }
  catch (e) {
    codeError.value = e instanceof Error ? e.message : String(e)
  }
}, { immediate: true })

useHead({ title: () => page.value?.label ?? 'Плагин' })
</script>

<template>
  <div class="flex flex-col gap-6">
    <USkeleton v-if="pluginsPending && !page" class="h-12 w-1/2" />

    <UEmpty
      v-else-if="!page"
      icon="i-lucide-puzzle"
      title="Раздел недоступен"
      description="Плагин, добавивший этот раздел, выключен или удалён."
      :actions="[{ label: 'Открыть маркетплейс', icon: 'i-lucide-store', to: '/dashboard/marketplace' }]"
      variant="naked"
      class="py-8"
    />

    <template v-else>
      <UPageHeader :title="page.label" :description="page.description">
        <template #headline>
          <UBadge color="neutral" variant="subtle" icon="i-lucide-puzzle">
            {{ page.pluginName }}
          </UBadge>
        </template>
        <template #links>
          <UButton
            v-bind="toolbarButton.refresh"
            :loading="pending"
            @click="refresh()"
          />
        </template>
      </UPageHeader>

      <UAlert
        v-if="error"
        color="error"
        variant="soft"
        icon="i-lucide-circle-alert"
        title="Не удалось загрузить данные"
        :description="error.message"
      />

      <PluginsDeclarativeTable
        v-else-if="page.view.type === 'table'"
        :spec="page.view"
        :rows="rows"
        :pending="pending"
        :title="page.label"
      />

      <template v-else>
        <UAlert
          v-if="codeError"
          color="error"
          variant="soft"
          icon="i-lucide-bug"
          title="Ошибка в коде плагина"
          :description="codeError"
        />
        <USkeleton v-else-if="!component || pending" class="h-64" />
        <component
          :is="component"
          v-else
          :rows="rows"
          :subject-id="subjectId"
        />
      </template>
    </template>
  </div>
</template>
