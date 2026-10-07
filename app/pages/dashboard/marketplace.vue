<script setup lang="ts">
import type { BreadcrumbItem, TabsItem } from '@nuxt/ui'
import type { CatalogEntry, CatalogSource, InstalledPlugin, PluginCategory } from '#shared/plugins/manifest'
import { PLUGIN_CATEGORIES } from '#shared/plugins/manifest'

const breadcrumbItems: BreadcrumbItem[] = [
  { label: 'Главная', to: '/dashboard' },
  { label: 'Маркетплейс' },
]

const toast = useToast()
const { plugins: installed, canManage, refresh: refreshInstalled } = usePlugins()

const { data: catalog, pending: catalogPending, refresh: refreshCatalog } = useFetch<{ sources: CatalogSource[] }>(
  '/api/plugins/catalog',
  { key: 'plugins:catalog', server: false, default: () => ({ sources: [] }) },
)

interface Listing {
  source: CatalogSource
  entry: CatalogEntry
  installed: InstalledPlugin | null
}

const listings = computed<Listing[]>(() =>
  (catalog.value?.sources ?? []).flatMap(source =>
    source.plugins.map(entry => ({
      source,
      entry,
      installed: installed.value.find(p => p.id === entry.id) ?? null,
    })),
  ),
)
const sourceErrors = computed(() => (catalog.value?.sources ?? []).filter(s => s.error))

// ─── фильтры ────────────────────────────────────────────────────────────────

const tab = ref<'catalog' | 'installed'>('catalog')
const tabs = computed<TabsItem[]>(() => [
  { label: 'Каталог', value: 'catalog', icon: 'i-lucide-store' },
  { label: `Установленные (${installed.value.length})`, value: 'installed', icon: 'i-lucide-package-check' },
])

const search = ref('')
const category = ref<PluginCategory | 'all'>('all')
const categoryItems = [
  { label: 'Все категории', value: 'all' as const },
  ...Object.entries(PLUGIN_CATEGORIES).map(([value, c]) => ({ label: c.label, value: value as PluginCategory, icon: c.icon })),
]

const visible = computed(() => {
  const q = search.value.trim().toLowerCase()
  return listings.value.filter(l =>
    (tab.value === 'catalog' || l.installed)
    && (category.value === 'all' || l.entry.category === category.value)
    && (!q || `${l.entry.name} ${l.entry.description} ${l.entry.author ?? ''}`.toLowerCase().includes(q)),
  )
})

// Установленные плагины, которых уже нет ни в одном каталоге, — тоже показываем.
const orphans = computed(() =>
  tab.value === 'installed'
    ? installed.value.filter(p => !listings.value.some(l => l.entry.id === p.id))
    : [],
)

// ─── действия ───────────────────────────────────────────────────────────────

const busy = ref<string | null>(null)
// Код-плагин ждёт подтверждения. Listing держим и после закрытия окна,
// чтобы текст не «мигал» пустым во время анимации.
const confirmOpen = ref(false)
const confirmCode = ref<Listing | null>(null)

async function run(id: string, action: () => Promise<unknown>, success: string) {
  busy.value = id
  try {
    await action()
    await refreshInstalled()
    toast.add({ title: success, color: 'success', icon: 'i-lucide-check' })
  }
  catch (e) {
    const err = e as { data?: { message?: string }, message?: string }
    toast.add({ title: err.data?.message ?? err.message ?? 'Ошибка', color: 'error', icon: 'i-lucide-circle-alert' })
  }
  finally {
    busy.value = null
  }
}

function install(l: Listing, confirmed = false) {
  // Код-плагин исполняется в браузере с правами пользователя — спрашиваем явно.
  if (l.entry.hasCode && !confirmed && !l.installed) {
    confirmCode.value = l
    confirmOpen.value = true
    return
  }
  confirmOpen.value = false
  const verb = l.installed ? 'обновлён' : 'установлен'
  return run(
    l.entry.id,
    () => $fetch('/api/plugins/install', { method: 'POST', body: { source: l.source.id, id: l.entry.id } }),
    `«${l.entry.name}» ${verb}`,
  )
}

function toggle(p: InstalledPlugin, enabled: boolean) {
  return run(
    p.id,
    () => $fetch(`/api/plugins/${p.id}`, { method: 'PATCH', body: { enabled } }),
    enabled ? `«${p.manifest.name}» включён` : `«${p.manifest.name}» выключен`,
  )
}

function uninstall(p: InstalledPlugin) {
  return run(
    p.id,
    () => $fetch(`/api/plugins/${p.id}`, { method: 'DELETE' }),
    `«${p.manifest.name}» удалён`,
  )
}

function refreshAll() {
  refreshCatalog()
  refreshInstalled()
}

const categoryLabel = (c?: PluginCategory) => (c ? PLUGIN_CATEGORIES[c].label : null)
const contributions = (p: InstalledPlugin) => (p.manifest.contributes?.subjectPages ?? []).map(s => s.label)
</script>

<template>
  <NuxtLayout name="dashboard" panel-id="dashboard-marketplace" panel-title="Маркетплейс">
    <template #navbar-title>
      <UBreadcrumb :items="breadcrumbItems" />
    </template>

    <div class="flex flex-col gap-6">
      <UPageHeader
        title="Маркетплейс расширений"
        description="Плагины добавляют в предметы новые разделы: таблицы, шкалы оценивания, аналитику. Установка — в один клик, без пересборки приложения."
      >
        <template #links>
          <UButton
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="ghost"
            :loading="catalogPending"
            @click="refreshAll"
          />
        </template>
      </UPageHeader>

      <UAlert
        v-if="!canManage"
        color="info"
        variant="soft"
        icon="i-lucide-shield"
        title="Только просмотр"
        description="Устанавливать и удалять плагины может администратор (NUXT_PLUGIN_ADMINS)."
      />

      <UAlert
        v-for="s in sourceErrors"
        :key="s.id"
        color="warning"
        variant="soft"
        icon="i-lucide-cloud-off"
        :title="`Каталог недоступен: ${s.name}`"
        :description="s.error"
      />

      <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
        <UTabs v-model="tab" :items="tabs" :content="false" class="sm:w-auto" />
        <div class="flex-1" />
        <UInput v-model="search" icon="i-lucide-search" placeholder="Поиск плагинов" class="w-full sm:w-64" />
        <USelect v-model="category" :items="categoryItems" class="w-full sm:w-48" />
      </div>

      <UPageGrid v-if="catalogPending && !listings.length">
        <USkeleton v-for="i in 3" :key="i" class="h-56" />
      </UPageGrid>

      <UEmpty
        v-else-if="!visible.length && !orphans.length"
        icon="i-lucide-package-search"
        :title="tab === 'installed' ? 'Пока ничего не установлено' : 'Ничего не найдено'"
        :description="tab === 'installed' ? 'Откройте каталог и поставьте первый плагин.' : 'Попробуйте изменить поиск или категорию.'"
        variant="naked"
        class="py-8"
      />

      <UPageGrid v-else>
        <UCard
          v-for="l in visible"
          :key="`${l.source.id}:${l.entry.id}`"
          :ui="{ root: 'flex flex-col', body: 'flex-1 flex flex-col gap-3', footer: 'flex items-center gap-2' }"
        >
          <div class="flex items-start gap-3">
            <div class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <UIcon :name="l.entry.icon ?? 'i-lucide-puzzle'" class="size-5 text-primary" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="font-semibold text-highlighted">
                {{ l.entry.name }}
              </p>
              <p class="text-xs text-muted">
                v{{ l.entry.version }}<template v-if="l.entry.author">
                  · {{ l.entry.author }}
                </template>
              </p>
            </div>
          </div>

          <p class="text-sm text-muted flex-1">
            {{ l.entry.description }}
          </p>

          <div class="flex flex-wrap gap-1.5">
            <UBadge v-if="categoryLabel(l.entry.category)" color="neutral" variant="subtle">
              {{ categoryLabel(l.entry.category) }}
            </UBadge>
            <UBadge v-if="l.entry.hasCode" color="warning" variant="subtle" icon="i-lucide-code">
              Исполняет код
            </UBadge>
            <UBadge v-else color="success" variant="subtle" icon="i-lucide-shield-check">
              Без кода
            </UBadge>
            <UBadge v-if="l.source.id !== 'official'" color="neutral" variant="outline" icon="i-lucide-globe">
              {{ l.source.name }}
            </UBadge>
          </div>

          <template v-if="l.installed && contributions(l.installed).length">
            <p class="text-xs text-dimmed">
              Разделы предмета: {{ contributions(l.installed).join(', ') }}
            </p>
          </template>

          <template #footer>
            <template v-if="!l.installed">
              <UButton
                icon="i-lucide-download"
                :loading="busy === l.entry.id"
                :disabled="!canManage || !!busy"
                @click="install(l)"
              >
                Установить
              </UButton>
            </template>
            <template v-else>
              <USwitch
                :model-value="l.installed.enabled"
                :disabled="!canManage || !!busy"
                :label="l.installed.enabled ? 'Включён' : 'Выключен'"
                @update:model-value="(v: boolean) => toggle(l.installed!, v)"
              />
              <div class="flex-1" />
              <UButton
                v-if="l.installed.version !== l.entry.version"
                icon="i-lucide-arrow-up-circle"
                size="sm"
                :loading="busy === l.entry.id"
                :disabled="!canManage || !!busy"
                @click="install(l)"
              >
                Обновить до {{ l.entry.version }}
              </UButton>
              <UButton
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                size="sm"
                aria-label="Удалить"
                :disabled="!canManage || !!busy"
                @click="uninstall(l.installed)"
              />
            </template>
          </template>
        </UCard>

        <UCard v-for="p in orphans" :key="p.id" :ui="{ footer: 'flex items-center gap-2' }">
          <p class="font-semibold text-highlighted">
            {{ p.manifest.name }}
          </p>
          <p class="text-xs text-muted">
            v{{ p.version }} · источник «{{ p.source }}» недоступен
          </p>
          <template #footer>
            <USwitch
              :model-value="p.enabled"
              :disabled="!canManage || !!busy"
              @update:model-value="(v: boolean) => toggle(p, v)"
            />
            <div class="flex-1" />
            <UButton icon="i-lucide-trash-2" color="error" variant="ghost" size="sm" :disabled="!canManage || !!busy" @click="uninstall(p)" />
          </template>
        </UCard>
      </UPageGrid>
    </div>

    <ConfirmModal
      :open="confirmOpen"
      title="Плагин исполняет код"
      :description="`«${confirmCode?.entry.name}» содержит JavaScript, который выполняется в браузере с правами текущего пользователя и может читать данные журнала. Устанавливайте только плагины из доверенных каталогов.`"
      confirm-label="Установить"
      confirm-color="warning"
      confirm-icon="i-lucide-download"
      @close="confirmOpen = false"
      @confirm="confirmCode && install(confirmCode, true)"
    />
  </NuxtLayout>
</template>
