import {
  isoDateTimeSchema,
  nonNegativeIntegerSchema,
  requiredTrimmedStringWithMaxSchema,
  uuidV4Schema,
} from '#shared/types/backend/zod-utils'
import { z } from 'zod'

const LESSON_TYPES = ['LECTURE', 'PRACTICE'] as const

type LessonType = (typeof LESSON_TYPES)[number]

interface CreateLessonRequest {
  name: string
  dateTime: string
  type: LessonType
  subjectId: string
}

interface CreateLessonsByTypeRequest {
  subjectId: string
  lectureCount: number
  practiceCount: number
}

interface LessonResponse {
  id: string
  name: string
  dateTime: string
  type: LessonType
  subjectId: string
  groupId: string | null
  subgroupNumber: number | null
  decayFactor: number | null
  archived: boolean
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

const lessonNameSchema = requiredTrimmedStringWithMaxSchema(
  'Lesson name is required',
  120,
  'Lesson name must be 120 characters or less',
)

const lessonDateTimeSchema = isoDateTimeSchema('Lesson dateTime must be a valid ISO datetime string')

const subjectIdSchema = uuidV4Schema('Subject ID must be a valid UUID v4')

const lessonTypeSchema = z.enum(LESSON_TYPES)

const lessonCountSchema = nonNegativeIntegerSchema(
  'Lesson count must be an integer',
  'Lesson count cannot be negative',
)

const createLessonRequestSchema: z.ZodType<CreateLessonRequest> = z.object({
  name: lessonNameSchema,
  dateTime: lessonDateTimeSchema,
  type: lessonTypeSchema,
  subjectId: subjectIdSchema,
})

const createLessonsByTypeRequestSchema: z.ZodType<CreateLessonsByTypeRequest> = z.object({
  subjectId: subjectIdSchema,
  lectureCount: lessonCountSchema,
  practiceCount: lessonCountSchema,
}).refine(
  request => request.lectureCount > 0 || request.practiceCount > 0,
  { message: 'At least one lesson must be requested' },
)

type CreateLessonRequestPayload = z.output<typeof createLessonRequestSchema>
type CreateLessonsByTypeRequestPayload = z.output<typeof createLessonsByTypeRequestSchema>

export type {
  CreateLessonRequest,
  CreateLessonRequestPayload,
  CreateLessonsByTypeRequest,
  CreateLessonsByTypeRequestPayload,
  LessonResponse,
  LessonType,
}

export {
  createLessonRequestSchema,
  createLessonsByTypeRequestSchema,
}
