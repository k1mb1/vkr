import type { InferOutput } from 'valibot'
import type { SchemaFor } from '../valibot-utils'
import type { CreateGroupRequest } from './types'
import * as v from 'valibot'

const CreateGroupRequestSchema: SchemaFor<CreateGroupRequest> = v.object({
  groupName: v.pipe(v.string(), v.minLength(1, 'Введите название группы')),
  students: v.pipe(
    v.array(
      v.object({
        username: v.string(),
        subgroupIndex: v.union([v.null(), v.number()]),
      }),
    ),
    v.minLength(1, 'Добавьте хотя бы одного студента'),
  ),
})

type CreateGroupRequestPayload = InferOutput<typeof CreateGroupRequestSchema>

export type {
  CreateGroupRequestPayload,
}

export {
  CreateGroupRequestSchema,
}
