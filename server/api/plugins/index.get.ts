import type { InstalledPluginsResponse } from '#shared/plugins/manifest'
import { canManagePlugins, readRegistry } from '#server/utils/marketplace'

/** Установленные плагины — клиент по ним строит разделы и грузит код. */
export default defineEventHandler(async (event): Promise<InstalledPluginsResponse> => {
  await requireUserSession(event)
  setResponseHeader(event, 'cache-control', 'no-store')
  return {
    plugins: await readRegistry(),
    canManage: await canManagePlugins(event),
  }
})
