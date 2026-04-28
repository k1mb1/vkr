import type { SchemaFor } from '#shared/types/backend/valibot-utils'
import type { InferOutput } from 'valibot'
import type { CreateStudentRequest, UpdateStudentRequest } from './types'
import {
  string,
  uuidV4,
} from '#shared/types/backend/valibot-utils'
import * as v from 'valibot'

const createStudentRequestSchema: SchemaFor<CreateStudentRequest> = v.object({
  username: string('Username is required'),
  groupId: v.optional(v.nullable(uuidV4())),
})

const updateStudentRequestSchema: SchemaFor<UpdateStudentRequest> = v.object({
  name: v.optional(string('Name cannot be empty')),
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
