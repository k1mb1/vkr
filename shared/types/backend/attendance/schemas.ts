import type { SchemaFor } from '#shared/types/backend/valibot-utils'
import type { InferOutput } from 'valibot'
import type { UpsertAttendanceRequest } from './types'
import { uuidV4 } from '#shared/types/backend/valibot-utils'
import { PRESENCE_TYPES } from './types'
import * as v from 'valibot'

const upsertAttendanceRequestSchema: SchemaFor<UpsertAttendanceRequest> = v.object({
  studentId: uuidV4(),
  presence: v.picklist(PRESENCE_TYPES),
  note: v.optional(v.nullable(v.pipe(v.string(), v.maxLength(5000, 'Note must be 5000 characters or less')))),
})

type UpsertAttendanceRequestPayload = InferOutput<typeof upsertAttendanceRequestSchema>

export type {
  UpsertAttendanceRequestPayload,
}

export {
  upsertAttendanceRequestSchema,
}
