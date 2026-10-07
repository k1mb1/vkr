import { readPluginFile } from '#server/utils/marketplace'

const CONTENT_TYPES: Record<string, string> = {
  js: 'text/javascript; charset=utf-8',
  mjs: 'text/javascript; charset=utf-8',
  json: 'application/json; charset=utf-8',
}

/**
 * Раздача файлов установленных плагинов с того же origin — так их код
 * подгружается через import() без ослабления CSP. Путь версионный, поэтому
 * кэшируем надолго.
 */
export default defineEventHandler(async (event) => {
  await requireUserSession(event)
  const id = getRouterParam(event, 'id') ?? ''
  const version = getRouterParam(event, 'version') ?? ''
  const file = getRouterParam(event, 'file') ?? ''

  const content = await readPluginFile(id, version, file)
  if (content == null)
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })

  const ext = file.split('.').pop() ?? ''
  setResponseHeaders(event, {
    'content-type': CONTENT_TYPES[ext] ?? 'application/octet-stream',
    'cache-control': 'private, max-age=31536000, immutable',
    'x-content-type-options': 'nosniff',
  })
  return content
})
