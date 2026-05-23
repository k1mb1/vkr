import type { H3Event } from 'h3'
import * as v from 'valibot'

/**
 * Validate the request body against a valibot schema. Returns `defaults` when
 * the body is empty. Converts valibot errors into 400 ProblemDetails-shaped
 * errors so the client gets a useful response instead of an opaque 500.
 */
export async function validateBody<TSchema extends v.GenericSchema>(
  event: H3Event,
  schema: TSchema,
  options: { allowEmpty?: boolean, emptyValue?: v.InferOutput<TSchema> } = {},
): Promise<v.InferOutput<TSchema>> {
  const { allowEmpty = true, emptyValue } = options
  const raw = await readBody(event, { strict: false }).catch(() => undefined)

  if (raw === undefined || raw === null || raw === '') {
    if (allowEmpty)
      return emptyValue as v.InferOutput<TSchema>
    throw createError({ statusCode: 400, statusMessage: 'Request body is required' })
  }

  try {
    return await v.parseAsync(schema, raw)
  }
  catch (err: unknown) {
    if (err instanceof v.ValiError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid request body',
        data: {
          issues: err.issues.map(i => ({
            path: i.path?.map((p: { key: PropertyKey }) => p.key).join('.'),
            message: i.message,
          })),
        },
      })
    }
    throw err
  }
}
