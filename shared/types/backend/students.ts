import type { StudentEntryResponse } from '#shared/types/backend/student-groups'
import type { SchemaFor } from '#shared/types/backend/valibot-utils'
import type { InferOutput } from 'valibot'
import {
  string,
  uuidV4,
} from '#shared/types/backend/valibot-utils'
import * as v from 'valibot'

interface StudentResponse {
  id: string
  username: string
  groupId?: string | null
  createdAt: string
  updatedAt: string
}

interface StudentSubjectSubgroup {
  id: string
  name: string
  students: string[]
}

interface StudentSubjectSubgroupsResponse {
  subjectId: string
  subjectName: string
  subgroups: StudentSubjectSubgroup[]
}

interface CreateStudentRequest {
  username: string
  groupId?: string | null
}

interface UpdateStudentRequest {
  name?: string
  groupId?: string | null
}

interface FindStudentsFilter {
  username?: string
  groupId?: string
}

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
  CreateStudentRequest,
  CreateStudentRequestPayload,
  FindStudentsFilter,
  StudentEntryResponse,
  StudentResponse,
  StudentSubjectSubgroup,
  StudentSubjectSubgroupsResponse,
  UpdateStudentRequest,
  UpdateStudentRequestPayload,
}

export {
  createStudentRequestSchema,
  updateStudentRequestSchema,
}