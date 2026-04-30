import type { LessonType } from '../lessons'

const PRESENCE_TYPES = [
  'NONE',
  'PRESENT',
  'NOT_PRESENT',
  'LATE',
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
  studentId: string
  presence: PresenceType
  note: string | null
}

interface SubjectAttendanceResponse {
  lessons: Array<{
    lessonId: string
    lessonName: string
    dateTime: string | null
    type: LessonType
    groupId: string | null
  }>
  students: Array<{ id: string, username: string }>
  attendances: AttendanceEntryResponse[]
}

export type {
  AttendanceEntryResponse,
  PresenceType,
  SubjectAttendanceResponse,
  UpsertAttendanceRequest,
}

export {
  PRESENCE_TYPES,
}
