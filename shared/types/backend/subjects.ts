import type { SchemaFor } from '#shared/types/backend/valibot-utils'
import type { InferOutput } from 'valibot'
import {
  stringMax,
  uuidV4,
} from '#shared/types/backend/valibot-utils'
import * as v from 'valibot'

interface SubjectResponse {
  id: string
  name: string
  description: string | null
  archived: boolean
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

interface AttachGroupToSubjectResponse {
  subjectId: string
  subjectName: string
  groupId: string
  groupName: string
  addedStudentsCount: number
  totalStudentsInSubject: number
}

interface FinalGradeResponse {
  studentId: string
  username: string
  earnedPoints: number
  maxPoints: number
  percentage: number | null
}

interface CreateSubjectRequest {
  name: string
  description?: string
  teacherId: string
}

interface FindSubjectsFilter {
  archived?: boolean
}

interface UpdateSubjectRequest {
  name: string
  description?: string | null
}

const DEFAULT_FIND_SUBJECTS_FILTER: FindSubjectsFilter = {
  archived: false,
}

const createSubjectRequestSchema: SchemaFor<CreateSubjectRequest> = v.object({
  name: stringMax(120),
  description: v.optional(stringMax(500)),
  teacherId: uuidV4(),
})

const updateSubjectRequestSchema: SchemaFor<UpdateSubjectRequest> = v.object({
  name: stringMax(120),
  description: v.optional(v.nullable(v.pipe(v.string(), v.maxLength(500, 'Не более 500 символов')))),
})

type CreateSubjectRequestPayload = InferOutput<typeof createSubjectRequestSchema>
type UpdateSubjectRequestPayload = InferOutput<typeof updateSubjectRequestSchema>

export type {
  AttachGroupToSubjectResponse,
  CreateSubjectRequest,
  CreateSubjectRequestPayload,
  FinalGradeResponse,
  FindSubjectsFilter,
  SubjectResponse,
  UpdateSubjectRequest,
  UpdateSubjectRequestPayload,
}

export {
  createSubjectRequestSchema,
  DEFAULT_FIND_SUBJECTS_FILTER,
  updateSubjectRequestSchema,
}
