import type { SchemaFor } from '#shared/types/backend/valibot-utils'
import type { InferInput, InferOutput } from 'valibot'
import {
  calendarDateTimeToIso,
  calendarDateToIso,
  nonNegativeInteger,
  stringMax,
  uuidV4,
} from '#shared/types/backend/valibot-utils'
import * as v from 'valibot'

const LESSON_TYPES = ['NONE', 'LECTURE', 'PRACTICE'] as const
const DAY_OF_WEEK = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const

type LessonType = (typeof LESSON_TYPES)[number]
type DayOfWeek = (typeof DAY_OF_WEEK)[number]

interface CreateLessonRequest {
  name: string
  dateTime?: string
  type: LessonType
  subjectId: string
}

interface CreateLessonsByTypeRequest {
  subjectId: string
  lectureCount: number
  practiceCount: number
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

interface UpdateDecayFactorRequest {
  decayFactor: number
}

interface LessonResponse {
  id: string
  name: string
  dateTime: string | null
  type: LessonType
  subjectId: string
  groupId: string | null
  subgroupNumber: number | null
  decayFactor: number
  archived: boolean
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

const lessonCountSchema = nonNegativeInteger(
  'Lesson count must be an integer',
  'Lesson count cannot be negative',
)

const positiveLessonCountSchema = v.pipe(
  v.number(),
  v.integer('Lesson count must be an integer'),
  v.minValue(1, 'Lesson count must be at least 1'),
)

const startDateSchema = calendarDateToIso('Start date must be a valid date')

const daysOfWeekSchema = v.pipe(
  v.array(
    v.pipe(
      v.array(v.picklist(DAY_OF_WEEK)),
      v.minLength(1, 'Each weekly pattern must contain at least one day'),
    ),
  ),
  v.minLength(1, 'At least one weekly pattern is required'),
)

const decayFactorSchema = v.pipe(
  v.number(),
  v.check(value => value > 0.0001 && value <= 1, 'Decay factor must be in range (0.0001, 1.0]'),
)

const createLessonRequestSchema = v.object({
  name: stringMax(120, 'Lesson name is required', 'Lesson name must be 120 characters or less'),
  dateTime: v.optional(calendarDateTimeToIso('Lesson dateTime must be a valid date/time')),
  type: v.picklist(LESSON_TYPES),
  subjectId: uuidV4(),
})

const createLessonsByTypeRequestSchema: SchemaFor<CreateLessonsByTypeRequest> = v.pipe(
  v.object({
    subjectId: uuidV4(),
    lectureCount: lessonCountSchema,
    practiceCount: lessonCountSchema,
  }),
  v.check(
    data => data.lectureCount > 0 || data.practiceCount > 0,
    'At least one lesson must be requested',
  ),
)

const bulkScheduleEntrySchema = v.object({
  type: v.picklist(LESSON_TYPES),
  startDate: startDateSchema,
  totalCount: positiveLessonCountSchema,
  daysOfWeek: daysOfWeekSchema,
})

const bulkScheduleRequestSchema = v.object({
  subjectId: uuidV4(),
  schedules: v.pipe(
    v.array(bulkScheduleEntrySchema),
    v.minLength(1, 'At least one schedule entry is required'),
  ),
})

const updateDecayFactorRequestSchema: SchemaFor<UpdateDecayFactorRequest> = v.object({
  decayFactor: decayFactorSchema,
})

type CreateLessonRequestPayload = InferOutput<typeof createLessonRequestSchema>
type CreateLessonsByTypeRequestPayload = InferOutput<typeof createLessonsByTypeRequestSchema>
type BulkScheduleRequestPayload = InferOutput<typeof bulkScheduleRequestSchema>
type UpdateDecayFactorRequestPayload = InferOutput<typeof updateDecayFactorRequestSchema>

type CreateLessonFormState = InferInput<typeof createLessonRequestSchema>
type BulkScheduleEntryFormState = InferInput<typeof bulkScheduleEntrySchema>
type BulkScheduleFormState = InferInput<typeof bulkScheduleRequestSchema>

export type {
  BulkScheduleEntry,
  BulkScheduleEntryFormState,
  BulkScheduleFormState,
  BulkScheduleRequest,
  BulkScheduleRequestPayload,
  CreateLessonFormState,
  CreateLessonRequest,
  CreateLessonRequestPayload,
  CreateLessonsByTypeRequest,
  CreateLessonsByTypeRequestPayload,
  DayOfWeek,
  LessonResponse,
  LessonType,
  UpdateDecayFactorRequest,
  UpdateDecayFactorRequestPayload,
}

export {
  bulkScheduleRequestSchema,
  createLessonRequestSchema,
  createLessonsByTypeRequestSchema,
  updateDecayFactorRequestSchema,
}