import type { H3Event } from 'h3'
import { getAccessToken } from '#server/utils/getAccessToken'

/**
 * Proactively refresh the OIDC session on incoming page/document requests.
 *
 * Why: with `ssr: true`, internal $fetch calls (e.g. `/api/proxy/*`) run as
 * separate H3 events. When they call `replaceUserSession`, the resulting
 * `Set-Cookie` lands on the internal response and is never delivered to the
 * browser. The browser then keeps sending the stale (and on the next request,
 * possibly invalidated) refresh_token until the session breaks.
 *
 * Running the refresh on the top-level page event guarantees the refreshed
 * session cookie is written to the HTML response that actually reaches the
 * client. Combined with single-flight dedup in `getAccessToken`, this keeps
 * the cookie in sync without blowing rotation budgets.
 */
export default defineEventHandler(async (event) => {
  // Skip non-page requests (API, assets, etc.) — those go through the proxy
  // which already calls getAccessToken; refreshing here too is redundant.
  if (!isPageRequest(event))
    return

  const session = await getUserSession(event)
  if (!session.secure?.refreshToken)
    return

  const expiresAt = session.tokenExpiresAt
  if (!expiresAt)
    return

  // Refresh a bit earlier than the proxy's 30s threshold so the cookie is
  // already updated by the time client-side requests start flying.
  const REFRESH_LEAD_MS = 60_000
  if (expiresAt - REFRESH_LEAD_MS > Date.now())
    return

  try {
    await getAccessToken(event)
  }
  catch (err: unknown) {
    const statusCode = (err as { statusCode?: number }).statusCode
    if (statusCode === 401) {
      // Refresh token is invalid or expired — clear the session so the auth
      // middleware redirects the user to login on the next navigation.
      await clearUserSession(event)
      const loginPath = `/auth/login?redirect=${encodeURIComponent(event.path ?? '/dashboard')}`
      return sendRedirect(event, loginPath, 302)
    }

    // Non-auth errors (network, 5xx) — let the page render; the proxy will
    // surface the error on individual API calls.
    console.warn('[refresh-session] failed', (err as Error)?.message ?? String(err))
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
  // Only HTML navigations — skip image/script/style requests
  return accept.includes('text/html')
}
