import { validateBody } from '#server/utils/validateBody'
import * as v from 'valibot'

const LogoutBodySchema = v.strictObject({})

export default defineEventHandler(async (event) => {
  await validateBody(event, LogoutBodySchema, { allowEmpty: true, emptyValue: {} })

  await clearUserSession(event)

  return { ok: true }
})
