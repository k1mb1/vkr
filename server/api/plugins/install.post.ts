import * as v from 'valibot'
import { installPlugin, requirePluginAdmin } from '#server/utils/marketplace'
import { validateBody } from '#server/utils/validateBody'

const Body = v.object({
  source: v.pipe(v.string(), v.maxLength(500)),
  id: v.pipe(v.string(), v.maxLength(100)),
})

/** Установка или обновление плагина из каталога (с проверкой sha256). */
export default defineEventHandler(async (event) => {
  await requirePluginAdmin(event)
  const body = await validateBody(event, Body, { allowEmpty: false })
  return installPlugin(event, body.source, body.id)
})
