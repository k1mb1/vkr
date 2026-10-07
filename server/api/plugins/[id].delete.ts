import { requirePluginAdmin, uninstallPlugin } from '#server/utils/marketplace'

export default defineEventHandler(async (event) => {
  await requirePluginAdmin(event)
  await uninstallPlugin(getRouterParam(event, 'id') ?? '')
  return { ok: true }
})
