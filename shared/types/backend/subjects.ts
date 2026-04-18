import type { SchemaFor } from '#shared/types/backend/valibot-utils'
import type { InferOutput } from 'valibot'
import {
  optionalTrimmedStringWithMaxSchema,
  requiredTrimmedStringWithMaxSchema,
  uuidV4Schema,
} from '#shared/types/backend/valibot-utils'
import * as v from 'valibot'

interface SubjectResponse {
  id: string
  name: string
  description?: string
  archived: boolean
  createdAt: string
  updatedAt: string
  archivedAt?: string
}

interface CreateSubjectRequest {
  name: string
  description?: string
  teacherId: string
}

interface FindSubjectsFilter {
  archived: boolean
}

const DEFAULT_FIND_SUBJECTS_FILTER: FindSubjectsFilter = {
  archived: false,
}

const subjectNameSchema = requiredTrimmedStringWithMaxSchema(
  'Name is required',
  120,
  'Name must be 120 characters or less',
)

const subjectDescriptionRequestSchema = optionalTrimmedStringWithMaxSchema(500)

const createSubjectRequestSchema: SchemaFor<CreateSubjectRequest> = v.object({
  name: subjectNameSchema,
  description: subjectDescriptionRequestSchema,
  teacherId: uuidV4Schema('Teacher ID must be a valid UUID v4'),
})

type CreateSubjectRequestPayload = InferOutput<typeof createSubjectRequestSchema>

export type {
  CreateSubjectRequest,
  CreateSubjectRequestPayload,
  FindSubjectsFilter,
  SubjectResponse,
}

export {
  createSubjectRequestSchema,
  DEFAULT_FIND_SUBJECTS_FILTER,
}
