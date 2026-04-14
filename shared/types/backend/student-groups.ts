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
  name: string
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

const createGroupRequestSchema: z.ZodType<CreateGroupRequest> = z.object({
  groupName: z.string(),
  studentNames: z.array(z.array(z.string())),
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
