import type { H3Event } from 'h3'
import type { CatalogEntry, CatalogSource, InstalledPlugin, PluginManifest } from '#shared/plugins/manifest'
import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import * as v from 'valibot'
import { validateExpression } from '#shared/plugins/expression'
import {
  HIGHLIGHT_COLORS,
  PLUGIN_CATEGORIES,
  PLUGIN_FILE_RE,
  PLUGIN_ID_RE,
  PLUGIN_VERSION_RE,
} from '#shared/plugins/manifest'

/** Встроенный каталог (папка marketplace/ в репозитории, едет в сборке). */
export const BUILTIN_SOURCE_ID = 'official'

const MAX_FILE_BYTES = 512 * 1024
const MAX_FILES = 32
const FETCH_TIMEOUT_MS = 10_000

const pluginStorage = () => useStorage('plugins')
const builtinStorage = () => useStorage('assets:marketplace')

// ─── схемы ──────────────────────────────────────────────────────────────────────

const Expression = v.pipe(
  v.string(),
  v.maxLength(2000),
  v.check(src => validateExpression(src) === null, issue => `Ошибка в выражении «${issue.input}»: ${validateExpression(String(issue.input))}`),
)
const Id = v.pipe(v.string(), v.regex(PLUGIN_ID_RE, 'id: только a-z, 0-9 и дефисы'))
const Icon = v.pipe(v.string(), v.regex(/^i-[a-z0-9-]+$/, 'icon: имя иконки вида i-lucide-…'))

const ColumnSchema = v.object({
  id: Id,
  label: v.pipe(v.string(), v.maxLength(80)),
  value: Expression,
  hint: v.optional(v.pipe(v.string(), v.maxLength(200))),
  format: v.optional(v.picklist(['text', 'number', 'percent', 'badge'])),
  digits: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(6))),
  align: v.optional(v.picklist(['left', 'center', 'right'])),
  highlight: v.optional(v.pipe(v.array(v.object({
    when: Expression,
    color: v.picklist(HIGHLIGHT_COLORS),
  })), v.maxLength(10))),
})

const ViewSchema = v.variant('type', [
  v.object({
    type: v.literal('table'),
    dataset: v.literal('students'),
    columns: v.pipe(v.array(ColumnSchema), v.minLength(1), v.maxLength(30)),
    filter: v.optional(Expression),
    sort: v.optional(v.object({ column: Id, order: v.optional(v.picklist(['asc', 'desc'])) })),
    emptyText: v.optional(v.pipe(v.string(), v.maxLength(200))),
  }),
  v.object({
    type: v.literal('component'),
    dataset: v.literal('students'),
    component: v.pipe(v.string(), v.regex(/^[A-Z]\w*$/i)),
  }),
])

const ManifestSchema = v.object({
  id: Id,
  name: v.pipe(v.string(), v.minLength(1), v.maxLength(80)),
  version: v.pipe(v.string(), v.regex(PLUGIN_VERSION_RE, 'version: semver, например 1.0.0')),
  description: v.pipe(v.string(), v.maxLength(500)),
  author: v.optional(v.pipe(v.string(), v.maxLength(80))),
  icon: v.optional(Icon),
  category: v.optional(v.picklist(Object.keys(PLUGIN_CATEGORIES) as (keyof typeof PLUGIN_CATEGORIES)[])),
  homepage: v.optional(v.pipe(v.string(), v.url())),
  main: v.optional(v.pipe(v.string(), v.regex(/^[\w-]+(?:\/[\w-]+)*\.m?js$/))),
  contributes: v.optional(v.object({
    subjectPages: v.optional(v.pipe(v.array(v.object({
      id: Id,
      label: v.pipe(v.string(), v.minLength(1), v.maxLength(40)),
      description: v.optional(v.pipe(v.string(), v.maxLength(200))),
      icon: v.optional(Icon),
      view: ViewSchema,
    })), v.maxLength(10))),
  })),
})

const CatalogEntrySchema = v.object({
  id: Id,
  version: v.pipe(v.string(), v.regex(PLUGIN_VERSION_RE)),
  name: v.string(),
  description: v.string(),
  author: v.optional(v.string()),
  icon: v.optional(Icon),
  category: v.optional(v.picklist(Object.keys(PLUGIN_CATEGORIES) as (keyof typeof PLUGIN_CATEGORIES)[])),
  hasCode: v.optional(v.boolean()),
  files: v.record(
    v.pipe(v.string(), v.regex(PLUGIN_FILE_RE)),
    v.pipe(v.string(), v.regex(/^[a-f0-9]{64}$/)),
  ),
})

const CatalogSchema = v.object({
  name: v.string(),
  plugins: v.array(CatalogEntrySchema),
})

function issuesText(issues: v.BaseIssue<unknown>[]): string {
  return issues
    .slice(0, 5)
    .map((i) => {
      const path = i.path?.map(p => String(p.key)).join('.')
      return path ? `${path}: ${i.message}` : i.message
    })
    .join('; ')
}

export function parseManifest(raw: unknown): PluginManifest {
  const res = v.safeParse(ManifestSchema, raw)
  if (!res.success)
    throw createError({ statusCode: 422, statusMessage: 'Invalid plugin manifest', message: `Некорректный manifest.json: ${issuesText(res.issues)}` })
  return res.output as PluginManifest
}

// ─── источники каталога ─────────────────────────────────────────────────────────

interface SourceDef {
  id: string
  /** Базовый URL удалённого каталога; для встроенного — undefined. */
  baseUrl?: string
}

export function listSources(event: H3Event): SourceDef[] {
  const urls = String(useRuntimeConfig(event).marketplaceUrls || '')
    .split(',')
    .map(s => s.trim().replace(/\/+$/, ''))
    .filter(Boolean)
  return [
    { id: BUILTIN_SOURCE_ID },
    ...urls.map(baseUrl => ({ id: baseUrl, baseUrl })),
  ]
}

async function readSourceFile(source: SourceDef, path: string): Promise<Buffer> {
  if (!source.baseUrl) {
    const raw = await builtinStorage().getItemRaw(path.replaceAll('/', ':'))
    if (raw == null)
      throw createError({ statusCode: 404, message: `Файл каталога не найден: ${path}` })
    return Buffer.isBuffer(raw) ? raw : Buffer.from(raw as string | Uint8Array)
  }
  const res = await $fetch.raw<ArrayBuffer>(`${source.baseUrl}/${path}`, {
    responseType: 'arrayBuffer',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
  const buf = Buffer.from(res._data ?? new ArrayBuffer(0))
  if (buf.byteLength > MAX_FILE_BYTES)
    throw createError({ statusCode: 413, message: `Файл слишком большой: ${path}` })
  return buf
}

async function loadSource(source: SourceDef): Promise<CatalogSource> {
  try {
    const raw = JSON.parse((await readSourceFile(source, 'index.json')).toString('utf8'))
    const res = v.safeParse(CatalogSchema, raw)
    if (!res.success)
      throw new Error(`index.json: ${issuesText(res.issues)}`)
    return { id: source.id, name: res.output.name, plugins: res.output.plugins as CatalogEntry[] }
  }
  catch (e) {
    return { id: source.id, name: source.baseUrl ?? 'Встроенный каталог', plugins: [], error: e instanceof Error ? e.message : String(e) }
  }
}

export async function loadCatalogs(event: H3Event): Promise<CatalogSource[]> {
  return Promise.all(listSources(event).map(loadSource))
}

// ─── установленные плагины ──────────────────────────────────────────────────────

const REGISTRY_KEY = 'registry.json'

export async function readRegistry(): Promise<InstalledPlugin[]> {
  const data = await pluginStorage().getItem<{ plugins?: InstalledPlugin[] }>(REGISTRY_KEY)
  return data?.plugins ?? []
}

async function writeRegistry(plugins: InstalledPlugin[]): Promise<void> {
  await pluginStorage().setItem(REGISTRY_KEY, { plugins })
}

const fileKey = (id: string, version: string, file: string) => `files:${id}:${version}:${file.replaceAll('/', ':')}`

export async function readPluginFile(id: string, version: string, file: string): Promise<string | null> {
  if (!PLUGIN_ID_RE.test(id) || !PLUGIN_VERSION_RE.test(version) || !PLUGIN_FILE_RE.test(file))
    return null
  const installed = (await readRegistry()).find(p => p.id === id && p.version === version)
  if (!installed)
    return null
  const raw = await pluginStorage().getItemRaw(fileKey(id, version, file))
  if (raw == null)
    return null
  return Buffer.isBuffer(raw) ? raw.toString('utf8') : String(raw)
}

async function removeFiles(id: string, version: string): Promise<void> {
  const storage = pluginStorage()
  const keys = await storage.getKeys(`files:${id}:${version}`)
  await Promise.all(keys.map(k => storage.removeItem(k)))
}

const sha256 = (buf: Buffer) => createHash('sha256').update(buf).digest('hex')

/**
 * Ставит (или обновляет) плагин из каталога: скачивает файлы пакета, сверяет
 * sha256 с каталогом, проверяет манифест и только потом кладёт в хранилище.
 */
export async function installPlugin(event: H3Event, sourceId: string, pluginId: string): Promise<InstalledPlugin> {
  const source = listSources(event).find(s => s.id === sourceId)
  if (!source)
    throw createError({ statusCode: 404, message: 'Каталог не найден' })

  const catalog = await loadSource(source)
  if (catalog.error)
    throw createError({ statusCode: 502, message: `Каталог недоступен: ${catalog.error}` })
  const entry = catalog.plugins.find(p => p.id === pluginId)
  if (!entry)
    throw createError({ statusCode: 404, message: 'Плагин не найден в каталоге' })

  const fileNames = Object.keys(entry.files)
  if (!fileNames.includes('manifest.json'))
    throw createError({ statusCode: 422, message: 'В пакете нет manifest.json' })
  if (fileNames.length > MAX_FILES)
    throw createError({ statusCode: 422, message: 'Слишком много файлов в пакете' })

  const files = new Map<string, Buffer>()
  for (const name of fileNames) {
    const buf = await readSourceFile(source, `packages/${entry.id}/${entry.version}/${name}`)
    if (buf.byteLength > MAX_FILE_BYTES)
      throw createError({ statusCode: 413, message: `Файл слишком большой: ${name}` })
    if (sha256(buf) !== entry.files[name])
      throw createError({ statusCode: 422, message: `Контрольная сумма не совпала: ${name}. Пакет повреждён или подменён.` })
    files.set(name, buf)
  }

  let rawManifest: unknown
  try {
    rawManifest = JSON.parse(files.get('manifest.json')!.toString('utf8'))
  }
  catch {
    throw createError({ statusCode: 422, message: 'manifest.json — не JSON' })
  }
  const manifest = parseManifest(rawManifest)
  if (manifest.id !== entry.id || manifest.version !== entry.version)
    throw createError({ statusCode: 422, message: 'id/version манифеста не совпадают с каталогом' })
  if (manifest.main && !files.has(manifest.main))
    throw createError({ statusCode: 422, message: `Нет файла кода ${manifest.main}` })
  for (const page of manifest.contributes?.subjectPages ?? []) {
    if (page.view.type === 'component' && !manifest.main)
      throw createError({ statusCode: 422, message: `Раздел «${page.label}» требует код плагина (main)` })
  }

  const storage = pluginStorage()
  for (const [name, buf] of files)
    await storage.setItemRaw(fileKey(entry.id, entry.version, name), buf)

  const registry = await readRegistry()
  const previous = registry.find(p => p.id === entry.id)
  const installed: InstalledPlugin = {
    id: entry.id,
    version: entry.version,
    source: source.id,
    enabled: previous?.enabled ?? true,
    installedAt: Date.now(),
    manifest,
  }
  await writeRegistry([...registry.filter(p => p.id !== entry.id), installed])
  if (previous && previous.version !== entry.version)
    await removeFiles(previous.id, previous.version)

  return installed
}

export async function setPluginEnabled(id: string, enabled: boolean): Promise<InstalledPlugin> {
  const registry = await readRegistry()
  const plugin = registry.find(p => p.id === id)
  if (!plugin)
    throw createError({ statusCode: 404, message: 'Плагин не установлен' })
  plugin.enabled = enabled
  await writeRegistry(registry)
  return plugin
}

export async function uninstallPlugin(id: string): Promise<void> {
  const registry = await readRegistry()
  const plugin = registry.find(p => p.id === id)
  if (!plugin)
    throw createError({ statusCode: 404, message: 'Плагин не установлен' })
  await writeRegistry(registry.filter(p => p.id !== id))
  await removeFiles(plugin.id, plugin.version)
}

// ─── права ──────────────────────────────────────────────────────────────────────

/** Может ли пользователь сессии ставить и удалять плагины. */
export async function canManagePlugins(event: H3Event): Promise<boolean> {
  const session = await getUserSession(event)
  const user = session.user
  if (!user?.sub)
    return false
  const admins = String(useRuntimeConfig(event).pluginAdmins || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
  if (!admins.length)
    return true
  return admins.includes(user.sub.toLowerCase()) || (!!user.email && admins.includes(user.email.toLowerCase()))
}

export async function requirePluginAdmin(event: H3Event): Promise<void> {
  await requireUserSession(event)
  if (!(await canManagePlugins(event)))
    throw createError({ statusCode: 403, message: 'Управлять плагинами может только администратор' })
}
