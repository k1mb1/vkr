import { loadCatalogs } from '#server/utils/marketplace'

/** Витрина маркетплейса: встроенный каталог + каталоги из NUXT_MARKETPLACE_URLS. */
export default defineEventHandler(async (event) => {
  await requireUserSession(event)
  setResponseHeader(event, 'cache-control', 'no-store')
  return { sources: await loadCatalogs(event) }
})
