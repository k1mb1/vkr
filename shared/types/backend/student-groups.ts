import type { SchemaFor } from '#shared/types/backend/valibot-utils'
import type { InferOutput } from 'valibot'
import {
  requiredTrimmedStringSchema,
  requiredTrimmedStringWithMaxSchema,
} from '#shared/types/backend/valibot-utils'
import * as v from 'valibot'

interface CreateGroupRequest {
  groupName: string
  studentNames: string[][]
}

interface StudentGroupPageResponse {
  id: string
  name: string
  subgroupCount: number
}

interface StudentEntryResponse {
  id: string
  username: string
}

interface StudentGroupResponse {
  id: string
  name: string
  students: StudentEntryResponse[]
  subgroups: SubgroupResponse[]
}

interface SubgroupResponse {
  id: string
  name: string
  students: StudentEntryResponse[]
}

const studentNamesSchema = v.pipe(
  v.array(
    v.pipe(
      v.array(requiredTrimmedStringSchema('Student name cannot be empty')),
      v.minLength(1, 'Each subgroup must contain at least one student'),
    ),
  ),
  v.minLength(1, 'Add at least one subgroup'),
)

const groupNameSchema = requiredTrimmedStringWithMaxSchema(
  'Group name is required',
  120,
  'Group name must be 120 characters or less',
)

const createGroupRequestSchema: SchemaFor<CreateGroupRequest> = v.object({
  groupName: groupNameSchema,
  studentNames: studentNamesSchema,
})

type CreateGroupRequestPayload = InferOutput<typeof createGroupRequestSchema>

export type {
  CreateGroupRequest,
  CreateGroupRequestPayload,
  StudentEntryResponse,
  StudentGroupPageResponse,
  StudentGroupResponse,
  SubgroupResponse,
}

export {
  createGroupRequestSchema,
}
