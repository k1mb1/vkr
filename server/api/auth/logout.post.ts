import * as v from 'valibot'
import { validateBody } from '#server/utils/validateBody'

const LogoutBodySchema = v.strictObject({})

export default defineEventHandler(async (event) => {
  await validateBody(event, LogoutBodySchema, { allowEmpty: true, emptyValue: {} })

  await clearUserSession(event)

  return { ok: true }
})
