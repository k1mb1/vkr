import type { SchemaFor } from '#shared/types/backend/valibot-utils'
import type { InferInput, InferOutput } from 'valibot'
import type {
  BulkScheduleEntry,
  BulkScheduleRequest,
  CreateLessonRequest,
  DayOfWeek,
  UpdateIssuedTaskIndexRequest,
  UpdateLessonRequest,
} from './types'
import {
  calendarDateTimeToIso,
  calendarDateToIso,
  isoDateTime,
  nonNegativeInteger,
  stringMax,
  uuidV4,
} from '#shared/types/backend/valibot-utils'
import {
  DAY_OF_WEEK,
  ISSUANCE_MODES,
  LESSON_TYPES,
  PENALTY_MODES,
} from './types'
import * as v from 'valibot'

const positiveLessonCountSchema = v.pipe(
  v.number(),
  v.integer('Lesson count must be an integer'),
  v.minValue(1, 'Lesson count must be at least 1'),
)

const startDateSchema = calendarDateToIso('Start date must be a valid date')

const daysOfWeekSchema: SchemaFor<DayOfWeek[][]> = v.pipe(
  v.array(
    v.pipe(
      v.array(v.picklist(DAY_OF_WEEK)),
      v.minLength(1, 'Each weekly pattern must contain at least one day'),
    ),
  ),
  v.minLength(1, 'At least one weekly pattern is required'),
)

const penaltyStepSchema = v.pipe(
  v.number(),
  v.check(value => value >= 0.0001 && value <= 1, 'Penalty step must be in range [0.0001, 1.0]'),
)

const createLessonRequestSchema: SchemaFor<CreateLessonRequest> = v.object({
  name: stringMax(120, 'Lesson name is required', 'Lesson name must be 120 characters or less'),
  dateTime: v.optional(calendarDateTimeToIso('Lesson dateTime must be a valid date/time')),
  type: v.picklist(LESSON_TYPES),
  subjectId: uuidV4(),
  groupId: v.optional(v.nullable(uuidV4())),
  issuanceMode: v.optional(v.picklist(ISSUANCE_MODES)),
  penaltyMode: v.optional(v.picklist(PENALTY_MODES)),
  penaltyStep: v.optional(penaltyStepSchema),
})

const bulkScheduleEntrySchema: SchemaFor<BulkScheduleEntry> = v.object({
  type: v.picklist(LESSON_TYPES),
  startDate: startDateSchema,
  totalCount: positiveLessonCountSchema,
  daysOfWeek: daysOfWeekSchema,
})

const bulkScheduleRequestSchema: SchemaFor<BulkScheduleRequest> = v.object({
  subjectId: uuidV4(),
  schedules: v.pipe(
    v.array(bulkScheduleEntrySchema),
    v.minLength(1, 'At least one schedule entry is required'),
  ),
})

const updateLessonRequestSchema: SchemaFor<UpdateLessonRequest> = v.partial(v.object({
  name: stringMax(120, 'Lesson name is required', 'Lesson name must be 120 characters or less'),
  dateTime: isoDateTime('Lesson dateTime must be a valid ISO datetime'),
  type: v.picklist(LESSON_TYPES),
  groupId: v.nullable(uuidV4()),
  issuanceMode: v.picklist(ISSUANCE_MODES),
  penaltyMode: v.picklist(PENALTY_MODES),
  penaltyStep: penaltyStepSchema,
}))

const updateIssuedTaskIndexRequestSchema: SchemaFor<UpdateIssuedTaskIndexRequest> = v.object({
  issuedTaskIndex: nonNegativeInteger('Issued task index must be an integer', 'Issued task index cannot be negative'),
})

type CreateLessonRequestPayload = InferOutput<typeof createLessonRequestSchema>
type BulkScheduleRequestPayload = InferOutput<typeof bulkScheduleRequestSchema>
type UpdateLessonRequestPayload = InferOutput<typeof updateLessonRequestSchema>
type UpdateIssuedTaskIndexRequestPayload = InferOutput<typeof updateIssuedTaskIndexRequestSchema>

type CreateLessonFormState = InferInput<typeof createLessonRequestSchema>
type BulkScheduleEntryFormState = InferInput<typeof bulkScheduleEntrySchema>
type BulkScheduleFormState = InferInput<typeof bulkScheduleRequestSchema>

export type {
  BulkScheduleEntryFormState,
  BulkScheduleFormState,
  BulkScheduleRequestPayload,
  CreateLessonFormState,
  CreateLessonRequestPayload,
  UpdateIssuedTaskIndexRequestPayload,
  UpdateLessonRequestPayload,
}

export {
  bulkScheduleRequestSchema,
  createLessonRequestSchema,
  updateIssuedTaskIndexRequestSchema,
  updateLessonRequestSchema,
}
