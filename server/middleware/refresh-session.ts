import type { H3Event } from 'h3'
import { getAccessToken } from '#server/utils/getAccessToken'

/**
 * Гейт аутентификации на загрузке страниц.
 *
 * На каждый переход по странице проверяем, что у сессии есть рабочий
 * access_token: `getAccessToken` сам обновит его через OIDC, если он истёк.
 * Если токена нет или refresh не удался (сервер перезапускали — in-memory
 * хранилище очистилось; refresh_token истёк/отозван) — чистим сессию и уводим
 * на login.
 *
 * Зачем это здесь, а не только в `auth.global.ts`: клиентский middleware видит
 * лишь sealed-cookie (`loggedIn`), которая живёт независимо от серверных токенов.
 * Без этой проверки протухшая cookie пускала бы на страницы, все запросы которых
 * затем падают с 401.
 */
export default defineEventHandler(async (event) => {
  if (!isPageRequest(event))
    return

  const session = await getUserSession(event)
  if (!session.secure?.sid)
    return

  try {
    await getAccessToken(event)
  }
  catch {
    await clearUserSession(event)
    const loginPath = `/auth/login?redirect=${encodeURIComponent(event.path ?? '/dashboard')}`
    return sendRedirect(event, loginPath, 302)
  }
})

function isPageRequest(event: H3Event): boolean {
  const url = event.path ?? ''
  if (
    url.startsWith('/api/')
    || url.startsWith('/_nuxt/')
    || url.startsWith('/_ipx/')
    || url.startsWith('/__nuxt')
    || url.startsWith('/auth/')
  ) {
    return false
  }

  const accept = getRequestHeader(event, 'accept') ?? ''
  return accept.includes('text/html')
}
