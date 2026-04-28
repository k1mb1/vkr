import type { SchemaFor } from '#shared/types/backend/valibot-utils'
import type { InferOutput } from 'valibot'
import type { CreateOrUpdateTeacherRequest } from './types'
import {
  email,
  stringMax,
} from '#shared/types/backend/valibot-utils'
import * as v from 'valibot'

const updateTeacherRequestSchema: SchemaFor<CreateOrUpdateTeacherRequest> = v.object({
  username: stringMax(120),
  email: email(),
})

type UpdateTeacherRequestPayload = InferOutput<typeof updateTeacherRequestSchema>

export type {
  UpdateTeacherRequestPayload,
}

export {
  updateTeacherRequestSchema,
}
