import type { SchemaFor } from '#shared/types/backend/valibot-utils'
import type { InferOutput } from 'valibot'
import type { CreateSubjectRequest, UpdateSubjectRequest } from './types'
import {
  isoDateTime,
  stringMax,
  uuidV4,
} from '#shared/types/backend/valibot-utils'
import * as v from 'valibot'

const createSubjectRequestSchema: SchemaFor<CreateSubjectRequest> = v.object({
  name: stringMax(120),
  description: v.nullable(v.pipe(v.string(), v.maxLength(500, 'Не более 500 символов'))),
  teacherId: uuidV4(),
})

const updateSubjectRequestSchema: SchemaFor<UpdateSubjectRequest> = v.partial(v.object({
  name: stringMax(120),
  description: v.nullable(v.pipe(v.string(), v.maxLength(500, 'Не более 500 символов'))),
  archived: v.boolean(),
  archivedAt: isoDateTime('archivedAt must be a valid ISO datetime'),
}))

type CreateSubjectRequestPayload = InferOutput<typeof createSubjectRequestSchema>
type UpdateSubjectRequestPayload = InferOutput<typeof updateSubjectRequestSchema>

export type {
  CreateSubjectRequestPayload,
  UpdateSubjectRequestPayload,
}

export {
  createSubjectRequestSchema,
  updateSubjectRequestSchema,
}
