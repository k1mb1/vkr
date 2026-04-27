import type { SchemaFor } from '#shared/types/backend/valibot-utils'
import type { InferInput, InferOutput } from 'valibot'
import { calendarDateTimeToIso, isoDateTime, nonNegativeInteger, stringMax } from '#shared/types/backend/valibot-utils'
import * as v from 'valibot'

interface TaskResponse {
  id: string
  lessonId: string
  title: string
  description: string | null
  maxPoints: number
  position: number
  isMandatory: boolean
  deadline: string | null
  createdAt: string
  updatedAt: string
}

interface CreateTaskRequest {
  title: string
  description?: string | null
  maxPoints: number
  position: number
  isMandatory: boolean
  deadline?: string
}

interface UpdateTaskRequest {
  title?: string
  description?: string | null
  maxPoints?: number
  position?: number
  isMandatory?: boolean
  deadline?: string
}

const maxPointsSchema = v.pipe(
  v.number(),
  v.minValue(1, 'Max points must be at least 1'),
)

const createTaskRequestSchema: SchemaFor<CreateTaskRequest> = v.object({
  title: stringMax(200, 'Task title is required', 'Task title must be 200 characters or less'),
  description: v.optional(v.nullable(v.pipe(v.string(), v.maxLength(5000, 'Description must be 5000 characters or less')))),
  maxPoints: maxPointsSchema,
  position: nonNegativeInteger('Task position must be an integer', 'Task position cannot be negative'),
  isMandatory: v.boolean(),
  deadline: v.optional(calendarDateTimeToIso('Task deadline must be a valid date/time')),
})

const updateTaskRequestSchema: SchemaFor<UpdateTaskRequest> = v.partial(v.object({
  title: stringMax(200, 'Task title is required', 'Task title must be 200 characters or less'),
  description: v.nullable(v.pipe(v.string(), v.maxLength(5000, 'Description must be 5000 characters or less'))),
  maxPoints: maxPointsSchema,
  position: nonNegativeInteger('Task position must be an integer', 'Task position cannot be negative'),
  isMandatory: v.boolean(),
  deadline: isoDateTime('Task deadline must be a valid ISO datetime'),
}))

type CreateTaskRequestPayload = InferOutput<typeof createTaskRequestSchema>
type UpdateTaskRequestPayload = InferOutput<typeof updateTaskRequestSchema>

type CreateTaskFormState = InferInput<typeof createTaskRequestSchema>

type UpdateTaskFormState = InferInput<typeof updateTaskRequestSchema>

export type {
  CreateTaskFormState,
  CreateTaskRequest,
  CreateTaskRequestPayload,
  TaskResponse,
  UpdateTaskFormState,
  UpdateTaskRequest,
  UpdateTaskRequestPayload,
}

export {
  createTaskRequestSchema,
  updateTaskRequestSchema,
}
