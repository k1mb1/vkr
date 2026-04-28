const LESSON_TYPES = [
  'NONE',
  'LECTURE',
  'PRACTICE',
] as const
type LessonType = (typeof LESSON_TYPES)[number]

const ISSUANCE_MODES = [
  'AUTO',
  'MANUAL',
] as const
type IssuanceMode = (typeof ISSUANCE_MODES)[number]

const PENALTY_MODES = [
  'NONE',
  'SUBTRACT',
  'MULTIPLY',
] as const
type PenaltyMode = (typeof PENALTY_MODES)[number]

const DAY_OF_WEEK = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const
type DayOfWeek = (typeof DAY_OF_WEEK)[number]

interface CreateLessonRequest {
  name: string
  dateTime?: string
  type: LessonType
  subjectId: string
  issuanceMode?: IssuanceMode
  penaltyMode?: PenaltyMode
  penaltyStep?: number
}

interface CreateLessonsByTypeRequest {
  subjectId: string
  lectureCount: number
  practiceCount: number
}

interface FindLessonsFilter {
  subjectId: string
}

interface BulkScheduleEntry {
  type: LessonType
  startDate: string
  totalCount: number
  daysOfWeek: DayOfWeek[][]
}

interface BulkScheduleRequest {
  subjectId: string
  schedules: BulkScheduleEntry[]
}

interface UpdateLessonRequest {
  name?: string
  dateTime?: string
  type?: LessonType
  issuanceMode?: IssuanceMode
  penaltyMode?: PenaltyMode
  penaltyStep?: number
}

interface UpdateIssuedTaskIndexRequest {
  issuedTaskIndex: number
}

interface LessonResponse {
  id: string
  name: string
  dateTime: string | null
  type: LessonType
  subjectId: string
  groupId: string | null
  subgroupNumber: number | null
  issuanceMode: IssuanceMode
  issuedAt: string | null
  issuedTaskIndex: number
  penaltyMode: PenaltyMode
  penaltyStep: number
  createdAt: string
  updatedAt: string
}

export type {
  BulkScheduleEntry,
  BulkScheduleRequest,
  CreateLessonRequest,
  CreateLessonsByTypeRequest,
  DayOfWeek,
  FindLessonsFilter,
  IssuanceMode,
  LessonResponse,
  LessonType,
  PenaltyMode,
  UpdateIssuedTaskIndexRequest,
  UpdateLessonRequest,
}

export {
  DAY_OF_WEEK,
  ISSUANCE_MODES,
  LESSON_TYPES,
  PENALTY_MODES,
}
