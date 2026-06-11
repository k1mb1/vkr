import * as v from 'valibot'
import { getAccessToken } from '#server/utils/getAccessToken'
import { getTokens } from '#server/utils/tokenStore'
import { validateBody } from '#server/utils/validateBody'

const RefreshBodySchema = v.strictObject({})

export default defineEventHandler(async (event) => {
  await validateBody(event, RefreshBodySchema, { allowEmpty: true, emptyValue: {} })

  const session = await getUserSession(event)
  const sid = session.secure?.sid

  const stored = sid ? await getTokens(sid) : null
  if (!stored?.refreshToken) {
    throw createError({
      statusCode: 401,
      statusMessage: 'No refresh token. Please log in again.',
    })
  }

  const nowMs = Date.now()
  if (session.tokenExpiresAt && session.tokenExpiresAt - 30_000 > nowMs)
    return { success: true, skipped: true }

  await getAccessToken(event)

  return {
    success: true,
    skipped: false,
  }
})
