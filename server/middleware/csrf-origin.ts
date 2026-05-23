const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export default defineEventHandler((event) => {
  const path = event.path ?? ''
  if (!path.startsWith('/api/'))
    return

  if (SAFE_METHODS.has(event.method))
    return

  const origin = getHeader(event, 'origin') ?? getHeader(event, 'referer')
  if (!origin) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'Missing Origin/Referer header on state-changing request',
    })
  }

  const host = getRequestHost(event, { xForwardedHost: true })
  let originHost: string
  try {
    originHost = new URL(origin).host
  }
  catch {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden', message: 'Invalid Origin header' })
  }

  if (originHost !== host) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'Origin does not match request host',
    })
  }
})
