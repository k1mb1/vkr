import * as v from 'valibot'
import { deleteTokens } from '#server/utils/tokenStore'
import { validateBody } from '#server/utils/validateBody'

const LogoutBodySchema = v.strictObject({})

export default defineEventHandler(async (event) => {
  await validateBody(event, LogoutBodySchema, { allowEmpty: true, emptyValue: {} })

  // Чистим токены из серверного хранилища, затем гасим сессию.
  const session = await getUserSession(event)
  const sid = session.secure?.sid
  if (sid)
    await deleteTokens(sid)

  await clearUserSession(event)

  return { ok: true }
})
