import {
  emailSchema,
  requiredTrimmedStringWithMaxSchema,
} from '#shared/types/backend/zod-utils'
import { z } from 'zod'

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

const updateTeacherRequestSchema: z.ZodType<UpdateTeacherRequest> = z.object({
  username: teacherUsernameSchema,
  email: teacherEmailSchema,
})

type UpdateTeacherRequestPayload = z.output<typeof updateTeacherRequestSchema>

export type {
  TeacherResponse,
  UpdateTeacherRequest,
  UpdateTeacherRequestPayload,
}

export {
  updateTeacherRequestSchema,
}
