import type { SchemaFor } from '#shared/types/backend/valibot-utils'
import type { InferOutput } from 'valibot'
import { isoDateTime, uuidV4 } from '#shared/types/backend/valibot-utils'
import * as v from 'valibot'

const SUBMISSION_STATUSES = [
  'NOT_SUBMITTED',
  'SUBMITTED',
  'GRADED',
  'RESUBMIT',
] as const

type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number]

interface UpsertTaskGradeRequest {
  studentId: string
  value?: number | null
  comment?: string | null
  status: SubmissionStatus
  submittedAt?: string
}

interface TaskGradeResponse {
  id: string
  taskId: string
  lessonId: string
  studentId: string
  value: number | null
  comment: string | null
  status: SubmissionStatus
  submittedAt: string | null
  createdAt: string
  updatedAt: string
}

interface StudentTaskGradesResponse {
  studentId: string
  username: string
  grades: TaskGradeResponse[]
}

const upsertTaskGradeRequestSchema: SchemaFor<UpsertTaskGradeRequest> = v.object({
  studentId: uuidV4(),
  value: v.optional(v.nullable(v.number())),
  comment: v.optional(v.nullable(v.pipe(v.string(), v.maxLength(5000, 'Comment must be 5000 characters or less')))),
  status: v.picklist(SUBMISSION_STATUSES),
  submittedAt: v.optional(isoDateTime('submittedAt must be a valid ISO datetime')),
})

type UpsertTaskGradeRequestPayload = InferOutput<typeof upsertTaskGradeRequestSchema>

export type {
  StudentTaskGradesResponse,
  SubmissionStatus,
  TaskGradeResponse,
  UpsertTaskGradeRequest,
  UpsertTaskGradeRequestPayload,
}

export {
  SUBMISSION_STATUSES,
  upsertTaskGradeRequestSchema,
}
