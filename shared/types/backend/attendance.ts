import type { SchemaFor } from '#shared/types/backend/valibot-utils'
import type { InferOutput } from 'valibot'
import { uuidV4 } from '#shared/types/backend/valibot-utils'
import * as v from 'valibot'

const PRESENCE_TYPES = [
  'NONE',
  'PRESENT',
  'NOT_PRESENT',
] as const

type PresenceType = (typeof PRESENCE_TYPES)[number]

interface UpsertAttendanceRequest {
  studentId: string
  presence: PresenceType
  note?: string | null
}

interface AttendanceEntryResponse {
  attendanceId: string
  lessonId: string
  presence: PresenceType
  note: string | null
}

interface StudentAttendanceTableResponse {
  studentId: string
  username: string
  attendances: AttendanceEntryResponse[]
}

const upsertAttendanceRequestSchema: SchemaFor<UpsertAttendanceRequest> = v.object({
  studentId: uuidV4(),
  presence: v.picklist(PRESENCE_TYPES),
  note: v.optional(v.nullable(v.pipe(v.string(), v.maxLength(5000, 'Note must be 5000 characters or less')))),
})

type UpsertAttendanceRequestPayload = InferOutput<typeof upsertAttendanceRequestSchema>

export type {
  AttendanceEntryResponse,
  PresenceType,
  StudentAttendanceTableResponse,
  UpsertAttendanceRequest,
  UpsertAttendanceRequestPayload,
}

export {
  PRESENCE_TYPES,
  upsertAttendanceRequestSchema,
}
