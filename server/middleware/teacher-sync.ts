import { getAccessToken } from '#server/utils/getAccessToken'

/**
 * Sync the authenticated OIDC user to the backend as a teacher.
 *
 * Why server-side: the client plugin exposed internal API details and
 * ran an extra round-trip in the browser. Doing this on the server
 * keeps tokens and backend internals hidden from the client entirely.
 *
 * Sync is triggered once per session on the first dashboard page request.
 */
export default defineEventHandler(async (event) => {
  if (!isDashboardPageRequest(event))
    return

  const session = await getUserSession(event)
  const user = session.user

  if (!user?.sub || session.teacherSyncedAt)
    return

  const config = useRuntimeConfig(event)
  const backendUrl = config.public.backendBaseUrl

  if (!backendUrl)
    return

  try {
    const accessToken = await getAccessToken(event)

    await $fetch(`${backendUrl}/api/teachers/${encodeURIComponent(user.sub)}`, {
      method: 'PUT',
      headers: {
        'authorization': `Bearer ${accessToken}`,
        'content-type': 'application/json',
      },
      body: {
        email: user.email,
        username: user.name,
      },
    })

    await replaceUserSession(event, {
      ...session,
      teacherSyncedAt: Date.now(),
    })
  }
  catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn('[teacher-sync] failed', { sub: user.sub, message })
    // Non-fatal — page should still render
  }
})

function isDashboardPageRequest(event: import('h3').H3Event): boolean {
  const url = event.path ?? ''

  if (
    url.startsWith('/api/')
    || url.startsWith('/_nuxt/')
    || url.startsWith('/_ipx/')
    || url.startsWith('/__nuxt')
  ) {
    return false
  }

  if (!url.startsWith('/dashboard'))
    return false

  const accept = getRequestHeader(event, 'accept') ?? ''
  return accept.includes('text/html')
}
