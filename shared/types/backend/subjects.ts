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
  archived?: boolean
}

const DEFAULT_FIND_SUBJECTS_FILTER: FindSubjectsFilter = {
  archived: false,
}

const createSubjectRequestSchema: SchemaFor<CreateSubjectRequest> = v.object({
  name: stringMax(120),
  description: v.optional(stringMax(500)),
  teacherId: uuidV4(),
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
