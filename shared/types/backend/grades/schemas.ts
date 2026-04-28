import type { SchemaFor } from '#shared/types/backend/valibot-utils'
import type { InferOutput } from 'valibot'
import type { UpsertTaskGradeRequest } from './types'
import { isoDateTime, uuidV4 } from '#shared/types/backend/valibot-utils'
import { SUBMISSION_STATUSES } from './types'
import * as v from 'valibot'

const upsertTaskGradeRequestSchema: SchemaFor<UpsertTaskGradeRequest> = v.object({
  studentId: uuidV4(),
  value: v.optional(v.nullable(v.number())),
  comment: v.optional(v.nullable(v.pipe(v.string(), v.maxLength(5000, 'Comment must be 5000 characters or less')))),
  status: v.picklist(SUBMISSION_STATUSES),
  submittedAt: v.optional(isoDateTime('submittedAt must be a valid ISO datetime')),
})

type UpsertTaskGradeRequestPayload = InferOutput<typeof upsertTaskGradeRequestSchema>

export type {
  UpsertTaskGradeRequestPayload,
}

export {
  upsertTaskGradeRequestSchema,
}
