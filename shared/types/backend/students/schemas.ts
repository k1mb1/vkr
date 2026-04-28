import type { SchemaFor } from '#shared/types/backend/valibot-utils'
import type { InferOutput } from 'valibot'
import type { CreateStudentRequest, UpdateStudentRequest } from './types'
import {
  stringMax,
  uuidV4,
} from '#shared/types/backend/valibot-utils'
import * as v from 'valibot'

const createStudentRequestSchema: SchemaFor<CreateStudentRequest> = v.object({
  username: stringMax(120, 'Username is required', 'Username must be 120 characters or less'),
  groupId: v.optional(v.nullable(uuidV4())),
})

const updateStudentRequestSchema: SchemaFor<UpdateStudentRequest> = v.object({
  username: v.optional(stringMax(120, 'Username cannot be empty', 'Username must be 120 characters or less')),
  groupId: v.optional(v.nullable(uuidV4())),
})

type CreateStudentRequestPayload = InferOutput<typeof createStudentRequestSchema>
type UpdateStudentRequestPayload = InferOutput<typeof updateStudentRequestSchema>

export type {
  CreateStudentRequestPayload,
  UpdateStudentRequestPayload,
}

export {
  createStudentRequestSchema,
  updateStudentRequestSchema,
}
