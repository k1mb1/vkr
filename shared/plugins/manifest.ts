/**
 * Контракт плагинов маркетплейса: формат каталога, манифеста пакета и того,
 * что плагин может добавить в приложение. Общий для сервера (установка,
 * проверка) и клиента (отрисовка).
 */

export const PLUGIN_CATEGORIES = {
  tables: { label: 'Таблицы', icon: 'i-lucide-table' },
  grading: { label: 'Оценивание', icon: 'i-lucide-calculator' },
  analytics: { label: 'Аналитика', icon: 'i-lucide-chart-column' },
  export: { label: 'Экспорт', icon: 'i-lucide-file-output' },
  integration: { label: 'Интеграции', icon: 'i-lucide-plug' },
} as const

export type PluginCategory = keyof typeof PLUGIN_CATEGORIES

/** Цвета подсветки — совпадают с семантическими цветами @nuxt/ui. */
export const HIGHLIGHT_COLORS = ['success', 'warning', 'error', 'info', 'neutral', 'primary'] as const
export type HighlightColor = typeof HIGHLIGHT_COLORS[number]

export interface HighlightRule {
  /** Выражение-условие над строкой датасета, например `attendancePercent < 50`. */
  when: string
  color: HighlightColor
}

export interface TableColumnSpec {
  id: string
  label: string
  /** Выражение над строкой датасета: `name`, `round(total / maxTotal * 100)`… */
  value: string
  /** Подсказка в заголовке колонки. */
  hint?: string
  format?: 'text' | 'number' | 'percent' | 'badge'
  /** Знаков после запятой для number/percent (по умолчанию 0). */
  digits?: number
  align?: 'left' | 'center' | 'right'
  /** Первое сработавшее правило задаёт цвет ячейки (или бейджа). */
  highlight?: HighlightRule[]
}

/** Декларативная таблица: ядро само рисует её поверх датасета. */
export interface TableViewSpec {
  type: 'table'
  dataset: 'students'
  columns: TableColumnSpec[]
  /** Выражение-фильтр: строка остаётся в таблице, если оно истинно. */
  filter?: string
  sort?: { column: string, order?: 'asc' | 'desc' }
  /** Текст, когда после фильтра строк не осталось. */
  emptyText?: string
}

/** Раздел, который рисует компонент из кода плагина (`main`). */
export interface ComponentViewSpec {
  type: 'component'
  dataset: 'students'
  /** Имя, под которым плагин зарегистрировал компонент через `sdk.registerComponent`. */
  component: string
}

export type PluginViewSpec = TableViewSpec | ComponentViewSpec

/** Новый раздел предмета: вкладка в тулбаре и карточка в обзоре предмета. */
export interface SubjectPageContribution {
  id: string
  label: string
  description?: string
  icon?: string
  view: PluginViewSpec
}

export interface PluginManifest {
  /** kebab-case, уникален в пределах приложения. */
  id: string
  name: string
  version: string
  description: string
  author?: string
  icon?: string
  category?: PluginCategory
  homepage?: string
  /**
   * ES-модуль с кодом плагина (путь внутри пакета). Если задан — плагин
   * исполняет код в браузере, и маркетплейс предупреждает об этом при установке.
   */
  main?: string
  contributes?: {
    subjectPages?: SubjectPageContribution[]
  }
}

/** Запись каталога маркетплейса (`index.json`). */
export interface CatalogEntry {
  id: string
  version: string
  name: string
  description: string
  author?: string
  icon?: string
  category?: PluginCategory
  /** true — пакет содержит исполняемый код (`main`). */
  hasCode?: boolean
  /** Файлы пакета → sha256 (hex). Сервер сверяет хэши при установке. */
  files: Record<string, string>
}

export interface CatalogIndex {
  name: string
  plugins: CatalogEntry[]
}

/** Каталог источника вместе с его идентификатором (для установки). */
export interface CatalogSource {
  id: string
  name: string
  plugins: CatalogEntry[]
  error?: string
}

export interface InstalledPlugin {
  id: string
  version: string
  source: string
  enabled: boolean
  installedAt: number
  manifest: PluginManifest
}

export interface InstalledPluginsResponse {
  plugins: InstalledPlugin[]
  /** Может ли текущий пользователь ставить/удалять плагины. */
  canManage: boolean
}

export const PLUGIN_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const PLUGIN_VERSION_RE = /^\d+\.\d+\.\d+(?:-[0-9a-z.]+)?$/i
/** Имя файла пакета: только «плоские» пути из безопасных символов. */
export const PLUGIN_FILE_RE = /^[\w-]+(?:\/[\w-]+)*\.(?:json|js|mjs)$/

/** URL, по которому браузер получает файл установленного плагина. */
export function pluginFileUrl(id: string, version: string, file: string): string {
  return `/plugin-files/${id}/${version}/${file}`
}
