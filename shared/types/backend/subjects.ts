import { z } from 'zod'

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

const subjectNameSchema = z
  .string()
  .trim()
  .min(1, 'Name is required')
  .max(120, 'Name must be 120 characters or less')

const subjectDescriptionRequestSchema = z
  .string()
  .trim()
  .max(500)
  .optional()

const createSubjectRequestSchema: z.ZodType<CreateSubjectRequest> = z.object({
  name: subjectNameSchema,
  description: subjectDescriptionRequestSchema,
  teacherId: z.string().trim().min(1),
})

type CreateSubjectRequestPayload = z.output<typeof createSubjectRequestSchema>

export type {
  CreateSubjectRequest,
  CreateSubjectRequestPayload,
  FindSubjectsFilter,
  SubjectResponse,
}

export {
  createSubjectRequestSchema,
}
