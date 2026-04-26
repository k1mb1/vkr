import type { SchemaFor } from '#shared/types/backend/valibot-utils'
import type { InferOutput } from 'valibot'
import {
  email,
  stringMax,
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

const updateTeacherRequestSchema: SchemaFor<UpdateTeacherRequest> = v.object({
  username: stringMax(120),
  email: email(),
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
