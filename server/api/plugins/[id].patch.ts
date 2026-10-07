import * as v from 'valibot'
import { requirePluginAdmin, setPluginEnabled } from '#server/utils/marketplace'
import { validateBody } from '#server/utils/validateBody'

const Body = v.object({ enabled: v.boolean() })

/** Включить/выключить плагин, не удаляя его. */
export default defineEventHandler(async (event) => {
  await requirePluginAdmin(event)
  const id = getRouterParam(event, 'id') ?? ''
  const body = await validateBody(event, Body, { allowEmpty: false })
  return setPluginEnabled(id, body.enabled)
})
