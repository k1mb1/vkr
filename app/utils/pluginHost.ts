import type { Component } from 'vue'
import type { NuxtApp } from '#app'
import type { InstalledPlugin } from '#shared/plugins/manifest'
import * as Vue from 'vue'
import {
  UAlert,
  UBadge,
  UButton,
  UCard,
  UEmpty,
  UIcon,
  UProgress,
  USeparator,
  USkeleton,
  UTable,
  UTooltip,
} from '#components'
import { pluginFileUrl } from '#shared/plugins/manifest'
import { round2 } from '~/utils/number'

/**
 * SDK, который получает код-плагин в `setup(sdk)`. Плагин не тащит свою
 * копию Vue и UI-кита: всё берёт отсюда, поэтому его пакет — обычный ES-модуль
 * без сборки. Набор полей — публичный контракт: менять только с совместимостью.
 */
export interface PluginSdk {
  /** Версия контракта SDK. */
  apiVersion: 1
  pluginId: string
  vue: typeof Vue
  ui: Record<string, Component>
  registerComponent: (name: string, component: Component) => void
  /** GET к API бэкенда через серверный прокси (только чтение). */
  api: { get: <T = unknown>(path: string, query?: Record<string, string | number | boolean>) => Promise<T> }
  notify: (message: string, color?: 'success' | 'error' | 'info' | 'warning') => void
  format: { round2: (n: number) => number, percent: (n: number) => string }
}

const UI_KIT: Record<string, Component> = {
  UAlert,
  UBadge,
  UButton,
  UCard,
  UEmpty,
  UIcon,
  UProgress,
  USeparator,
  USkeleton,
  // Generic-компонент: его тип не сводится к Component, но в рантайме это обычный компонент.
  UTable: UTable as Component,
  UTooltip,
}

// pluginId → (имя → компонент). markRaw: компоненты не должны становиться реактивными.
const components = Vue.shallowReactive(new Map<string, Map<string, Component>>())
const loading = new Map<string, Promise<void>>()

function createSdk(pluginId: string, nuxtApp: NuxtApp): PluginSdk {
  return {
    apiVersion: 1,
    pluginId,
    vue: Vue,
    ui: UI_KIT,
    registerComponent(name, component) {
      const own = new Map(components.get(pluginId) ?? [])
      own.set(name, Vue.markRaw(component))
      components.set(pluginId, own)
    },
    api: {
      get(path, query) {
        const clean = path.replace(/^\/+/, '')
        if (clean.includes('..'))
          return Promise.reject(new Error('Недопустимый путь'))
        return $fetch(`/api/proxy/${clean}`, { method: 'GET', query })
      },
    },
    notify(message, color = 'info') {
      // Плагин зовёт notify когда угодно (после await, из обработчиков) —
      // контекст Nuxt восстанавливаем явно.
      nuxtApp.runWithContext(() => useToast().add({ title: message, color }))
    },
    format: {
      round2,
      percent: n => `${Math.round(n)}%`,
    },
  }
}

/**
 * Загружает код плагина (`manifest.main`) один раз за сессию и вызывает его
 * `setup(sdk)`. Код раздаётся с того же origin (/plugin-files/…), поэтому
 * import() проходит под действующей CSP.
 */
export function loadPluginCode(plugin: InstalledPlugin, nuxtApp: NuxtApp): Promise<void> {
  const main = plugin.manifest.main
  if (!main)
    return Promise.resolve()
  const cacheKey = `${plugin.id}@${plugin.version}`
  let promise = loading.get(cacheKey)
  if (!promise) {
    const sdk = createSdk(plugin.id, nuxtApp)
    promise = import(/* @vite-ignore */ pluginFileUrl(plugin.id, plugin.version, main))
      .then(async (mod: { default?: (sdk: PluginSdk) => unknown }) => {
        if (typeof mod.default !== 'function')
          throw new Error('Модуль плагина должен экспортировать по умолчанию функцию setup(sdk)')
        await mod.default(sdk)
      })
      .catch((e: unknown) => {
        loading.delete(cacheKey)
        throw e
      })
    loading.set(cacheKey, promise)
  }
  return promise
}

export function getPluginComponent(pluginId: string, name: string): Component | null {
  return components.get(pluginId)?.get(name) ?? null
}
