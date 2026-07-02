import { client } from '#hey-api/client.gen'

// hey-api клиент ходит через серверный прокси /api/proxy (он ставит OIDC-токен),
// а не напрямую на бэкенд. На SSR глобальный ofetch не резолвит относительный
// путь и не шлёт куки — поэтому абсолютный origin + проброс cookie.
export default defineNuxtPlugin(() => {
  if (import.meta.server) {
    const origin = useRequestURL().origin
    const headers = useRequestHeaders(['cookie'])

    client.setConfig({ baseUrl: `${origin}/api/proxy` })
    client.interceptors.request.use((request) => {
      if (headers.cookie && !request.headers.has('cookie'))
        request.headers.set('cookie', headers.cookie)
      return request
    })
    return
  }

  client.setConfig({ baseUrl: '/api/proxy' })
})
