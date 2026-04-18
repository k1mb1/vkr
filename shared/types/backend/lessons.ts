import type { SchemaFor } from '#shared/types/backend/valibot-utils'
import type { InferOutput } from 'valibot'
import {
  isoDateTimeSchema,
  nonNegativeIntegerSchema,
  requiredTrimmedStringWithMaxSchema,
  uuidV4Schema,
} from '#shared/types/backend/valibot-utils'
import * as v from 'valibot'

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

const lessonTypeSchema = v.picklist(LESSON_TYPES)

const lessonCountSchema = nonNegativeIntegerSchema(
  'Lesson count must be an integer',
  'Lesson count cannot be negative',
)

const createLessonRequestSchema: SchemaFor<CreateLessonRequest> = v.object({
  name: lessonNameSchema,
  dateTime: lessonDateTimeSchema,
  type: lessonTypeSchema,
  subjectId: subjectIdSchema,
})

const createLessonsByTypeRequestSchema: SchemaFor<CreateLessonsByTypeRequest> = v.pipe(
  v.object({
    subjectId: subjectIdSchema,
    lectureCount: lessonCountSchema,
    practiceCount: lessonCountSchema,
  }),
  v.check(
    data => data.lectureCount > 0 || data.practiceCount > 0,
    'At least one lesson must be requested',
  ),
)

type CreateLessonRequestPayload = InferOutput<typeof createLessonRequestSchema>
type CreateLessonsByTypeRequestPayload = InferOutput<typeof createLessonsByTypeRequestSchema>

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
