import { z } from 'zod'

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

const studentNamesSchema = z.array(
  z.array(
    z.string()
      .trim()
      .min(1, { message: 'Student name cannot be empty' }),
  ).min(1, { message: 'Each subgroup must contain at least one student' }),
).min(1, { message: 'Add at least one subgroup' })

const groupNameSchema = z.string()
  .trim()
  .min(1, { message: 'Group name is required' })
  .max(120, { message: 'Group name must be 120 characters or less' })

const createGroupRequestSchema: z.ZodType<CreateGroupRequest> = z.object({
  groupName: groupNameSchema,
  studentNames: studentNamesSchema,
})

type CreateGroupRequestPayload = z.output<typeof createGroupRequestSchema>

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
