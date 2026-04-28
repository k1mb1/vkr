import type { SchemaFor } from '#shared/types/backend/valibot-utils'
import type { InferOutput } from 'valibot'
import type { CreateGroupRequest, UpdateGroupRequest } from './types'
import {
  string,
  stringMax,
} from '#shared/types/backend/valibot-utils'
import * as v from 'valibot'

const studentNamesSchema = v.pipe(
  v.array(
    v.pipe(
      v.array(string('Student name cannot be empty')),
      v.minLength(1, 'Each subgroup must contain at least one student'),
    ),
  ),
  v.minLength(1, 'Add at least one subgroup'),
)

const createGroupRequestSchema: SchemaFor<CreateGroupRequest> = v.object({
  groupName: stringMax(120, 'Group name is required', 'Group name must be 120 characters or less'),
  studentNames: studentNamesSchema,
})

const updateGroupRequestSchema: SchemaFor<UpdateGroupRequest> = v.object({
  name: stringMax(120, 'Group name is required', 'Group name must be 120 characters or less'),
})

type CreateGroupRequestPayload = InferOutput<typeof createGroupRequestSchema>
type UpdateGroupRequestPayload = InferOutput<typeof updateGroupRequestSchema>

export type {
  CreateGroupRequestPayload,
  UpdateGroupRequestPayload,
}

export {
  createGroupRequestSchema,
  updateGroupRequestSchema,
}
