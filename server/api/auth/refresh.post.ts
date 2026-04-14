import { getAccessToken } from '#server/utils/getAccessToken'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const secure = session.secure

  if (!secure?.refreshToken) {
    throw createError({
      statusCode: 401,
      statusMessage: 'No refresh token. Please log in again.',
    })
  }

  const nowMs = Date.now()
  if (session.tokenExpiresAt && session.tokenExpiresAt - 30_000 > nowMs) {
    return { success: true, skipped: true }
  }

  await getAccessToken(event)

  return {
    success: true,
    skipped: false,
  }
})
