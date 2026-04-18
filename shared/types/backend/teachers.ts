import type { SchemaFor } from '#shared/types/backend/valibot-utils'
import type { InferOutput } from 'valibot'
import {
  emailSchema,
  requiredTrimmedStringWithMaxSchema,
} from '#shared/types/backend/valibot-utils'
import * as v from 'valibot'

interface UpdateTeacherRequest {
  username: string
  email: string
}

interface TeacherResponse {
  id: string
  username: string
  email: string
  createdAt: string
  updatedAt: string
}

const teacherUsernameSchema = requiredTrimmedStringWithMaxSchema(
  'Username is required',
  120,
  'Username must be 120 characters or less',
)

const teacherEmailSchema = emailSchema('Email must be a valid email address')

const updateTeacherRequestSchema: SchemaFor<UpdateTeacherRequest> = v.object({
  username: teacherUsernameSchema,
  email: teacherEmailSchema,
})

type UpdateTeacherRequestPayload = InferOutput<typeof updateTeacherRequestSchema>

export type {
  TeacherResponse,
  UpdateTeacherRequest,
  UpdateTeacherRequestPayload,
}

export {
  updateTeacherRequestSchema,
}
