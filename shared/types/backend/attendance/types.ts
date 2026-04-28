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

export type {
  AttendanceEntryResponse,
  PresenceType,
  StudentAttendanceTableResponse,
  UpsertAttendanceRequest,
}

export {
  PRESENCE_TYPES,
}
