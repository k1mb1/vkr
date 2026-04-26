import type { SchemaFor } from '#shared/types/backend/valibot-utils'
import type { InferOutput } from 'valibot'
import {
  string,
  stringMax,
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

interface GroupSubjectResponse {
  id: string
  name: string
}

interface StudentGroupResponse {
  id: string
  name: string
  subjects: GroupSubjectResponse[]
  students: StudentEntryResponse[]
  subgroups: SubgroupResponse[]
}

interface SubgroupResponse {
  id: string
  name: string
  students: StudentEntryResponse[]
}

interface FindGroupsFilter {
  name?: string
}

interface UpdateGroupRequest {
  name: string
}

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
  CreateGroupRequest,
  CreateGroupRequestPayload,
  FindGroupsFilter,
  GroupSubjectResponse,
  StudentEntryResponse,
  StudentGroupPageResponse,
  StudentGroupResponse,
  SubgroupResponse,
  UpdateGroupRequest,
  UpdateGroupRequestPayload,
}

export {
  createGroupRequestSchema,
  updateGroupRequestSchema,
}
