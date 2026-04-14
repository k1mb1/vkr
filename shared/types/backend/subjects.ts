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

interface UpdateSubjectRequest {
  name?: string
  description?: string | null
  archived?: boolean
}

const subjectNameSchema = z
  .string()
  .trim()
  .min(1, 'Name is required')
  .max(120, 'Name must be 120 characters or less')

const subjectDescriptionFormSchema = z
  .string()
  .trim()
  .max(500, 'Description must be 500 characters or less')
  .optional()
  .or(z.literal(''))

const subjectDescriptionRequestSchema = z
  .string()
  .trim()
  .max(500)
  .optional()

const createSubjectFormSchema = z.object({
  name: subjectNameSchema,
  description: subjectDescriptionFormSchema,
})

const createSubjectRequestSchema: z.ZodType<CreateSubjectRequest> = z.object({
  name: subjectNameSchema,
  description: subjectDescriptionRequestSchema,
  teacherId: z.string().trim().min(1),
})

type CreateSubjectFormData = z.output<typeof createSubjectFormSchema>
type CreateSubjectRequestPayload = z.output<typeof createSubjectRequestSchema>

function toCreateSubjectRequestPayload(
  form: CreateSubjectFormData,
  teacherId: string,
): CreateSubjectRequestPayload {
  const normalizedDescription = form.description?.trim()

  return {
    name: form.name.trim(),
    teacherId,
    ...(normalizedDescription ? { description: normalizedDescription } : {}),
  }
}

export type {
  CreateSubjectFormData,
  CreateSubjectRequest,
  CreateSubjectRequestPayload,
  FindSubjectsFilter,
  SubjectResponse,
  UpdateSubjectRequest,
}

export {
  createSubjectFormSchema,
  createSubjectRequestSchema,
  toCreateSubjectRequestPayload,
}
