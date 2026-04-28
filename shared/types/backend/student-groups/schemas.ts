import type { SchemaFor } from '#shared/types/backend/valibot-utils'
import type { InferOutput } from 'valibot'
import type { CreateGroupRequest, UpdateGroupRequest } from './types'
import {
  string,
  stringMax,
} from '#shared/types/backend/valibot-utils'
import * as v from 'valibot'

const createGroupStudentEntrySchema = v.object({
  username: stringMax(120, 'Student name is required', 'Student name must be 120 characters or less'),
  subgroupIndex: v.nullable(v.pipe(v.number(), v.integer('Subgroup index must be an integer'), v.minValue(0, 'Subgroup index cannot be negative'))),
})

const createGroupRequestSchema: SchemaFor<CreateGroupRequest> = v.object({
  groupName: stringMax(120, 'Group name is required', 'Group name must be 120 characters or less'),
  students: v.pipe(
    v.array(createGroupStudentEntrySchema),
    v.minLength(1, 'Add at least one student'),
  ),
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
